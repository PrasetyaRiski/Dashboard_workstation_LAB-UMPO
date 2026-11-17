"""Regression test provider Gemini untuk Jupyter AI.

Fokus:
- konversi pesan LangChain ke format ``google-genai``;
- key dibaca dari helper per-user, bukan dari config Jupyter AI;
- error key/kuota dipetakan ke pesan yang ramah tanpa false positive;
- pemakaian token chat tercatat di ledger harian;
- generate dan streaming memakai client yang disuntikkan (tanpa jaringan).

Jalankan di environment Jupyter (``/opt/ai_env``)::

    /opt/ai_env/bin/python -m pytest backend/tests/test_lab_gemini_ai.py -q
"""

import asyncio
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

PROVIDER_DIR = REPO_ROOT / "lab_gemini_ai_pkg"
if str(PROVIDER_DIR) not in sys.path:
    sys.path.insert(0, str(PROVIDER_DIR))

import lab_gemini  # noqa: E402

pytest.importorskip("jupyter_ai_magics")

import lab_gemini_ai as provider_mod  # noqa: E402
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage  # noqa: E402


# ==============================================================================
# Helper palsu
# ==============================================================================

def _part(text, thought=False):
    return SimpleNamespace(text=text, thought=thought)


def _response(text="", prompt=0, output=0, thoughts=0):
    parts = [] if text is None else [_part(text)]
    return SimpleNamespace(
        candidates=[SimpleNamespace(content=SimpleNamespace(parts=parts))],
        usage_metadata=SimpleNamespace(
            prompt_token_count=prompt,
            candidates_token_count=output,
            thoughts_token_count=thoughts,
        ),
    )


def _api_error(code, message):
    error = Exception(message)
    error.code = code
    return error


class _FakeModels:
    def __init__(self, response=None, chunks=None, error=None):
        self.response = response
        self.chunks = chunks or []
        self.error = error
        self.calls = []

    def generate_content(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return self.response

    def generate_content_stream(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return iter(self.chunks)


class _FakeClient:
    def __init__(self, response=None, chunks=None, error=None):
        self.models = _FakeModels(response=response, chunks=chunks, error=error)
        self.aio = SimpleNamespace(models=self.models)


class _FakeAsyncModels:
    """Versi async dari ``_FakeModels`` untuk jalur chat Jupyter AI."""

    def __init__(self, response=None, chunks=None, error=None):
        self.response = response
        self.chunks = chunks or []
        self.error = error
        self.calls = []

    async def generate_content(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return self.response

    async def generate_content_stream(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error

        async def iterator():
            for chunk in self.chunks:
                yield chunk

        return iterator()


def _provider(**kwargs):
    return provider_mod.LabGeminiProvider(model_id="gemini-2.5-flash", **kwargs)


# ==============================================================================
# Konversi pesan
# ==============================================================================

def test_text_from_content_handles_strings_and_blocks():
    assert provider_mod._text_from_content("halo") == "halo"
    assert provider_mod._text_from_content(None) == ""
    assert provider_mod._text_from_content([
        "a",
        {"type": "text", "text": "b"},
        _part("c"),
        {"image": "diabaikan"},
    ]) == "abc"


def test_messages_to_contents_merges_roles_and_extracts_system():
    messages = [
        SystemMessage(content="Aturan sistem"),
        HumanMessage(content="Halo"),
        HumanMessage(content=[{"type": "text", "text": "Lanjutan"}]),
        AIMessage(content="Hai"),
        HumanMessage(content="Pertanyaan baru"),
    ]

    contents, system = provider_mod.messages_to_contents(messages)

    assert system == "Aturan sistem"
    assert [content.role for content in contents] == ["user", "model", "user"]
    assert [part.text for part in contents[0].parts] == ["Halo", "Lanjutan"]
    assert [part.text for part in contents[1].parts] == ["Hai"]
    assert [part.text for part in contents[2].parts] == ["Pertanyaan baru"]


def test_messages_to_contents_skips_empty_and_system_only():
    contents, system = provider_mod.messages_to_contents([
        SystemMessage(content="  hanya sistem  "),
        HumanMessage(content="   "),
    ])

    assert contents == []
    assert system == "hanya sistem"


# ==============================================================================
# Respons dan statistik
# ==============================================================================

def test_response_text_skips_thought_parts():
    response = SimpleNamespace(candidates=[
        SimpleNamespace(content=SimpleNamespace(parts=[
            _part("rencana internal", thought=True),
            _part("jawaban akhir"),
            _part(None),
        ])),
    ])

    assert provider_mod._response_text(response) == "jawaban akhir"


def test_usage_counts_adds_thought_tokens_and_clamps_negative():
    usage = SimpleNamespace(
        prompt_token_count=10,
        candidates_token_count=5,
        thoughts_token_count=3,
    )
    assert provider_mod._usage_counts(usage) == (10, 8)

    negative = SimpleNamespace(
        prompt_token_count=-4,
        candidates_token_count=-2,
        thoughts_token_count=-1,
    )
    assert provider_mod._usage_counts(negative) == (0, 0)
    assert provider_mod._usage_counts(None) == (0, 0)


def test_record_usage_calls_daily_ledger(monkeypatch):
    calls = []
    monkeypatch.setattr(lab_gemini, "add_usage", lambda **kwargs: calls.append(kwargs))

    provider_mod.LabGeminiProvider._record_usage(
        SimpleNamespace(
            prompt_token_count=7,
            candidates_token_count=4,
            thoughts_token_count=1,
        )
    )
    provider_mod.LabGeminiProvider._record_usage(None)

    assert calls == [{"prompt_tokens": 7, "output_tokens": 5}]


def test_record_usage_never_breaks_chat(monkeypatch):
    def boom(**kwargs):
        raise OSError("disk penuh")

    monkeypatch.setattr(lab_gemini, "add_usage", boom)

    # Tidak boleh melempar exception.
    provider_mod.LabGeminiProvider._record_usage(
        SimpleNamespace(prompt_token_count=1, candidates_token_count=1)
    )


# ==============================================================================
# Key
# ==============================================================================

def test_api_key_missing_raises_friendly_error(monkeypatch):
    monkeypatch.setattr(lab_gemini, "read_key", lambda home=None: "")

    with pytest.raises(lab_gemini.GeminiKeyMissing) as excinfo:
        provider_mod.LabGeminiProvider._api_key()

    assert "modal" in str(excinfo.value).lower()


def test_api_key_reads_helper_per_user(monkeypatch):
    monkeypatch.setattr(lab_gemini, "read_key", lambda home=None: "AIza-test")

    assert provider_mod.LabGeminiProvider._api_key() == "AIza-test"


# ==============================================================================
# Pemetaan error
# ==============================================================================

@pytest.fixture()
def profile_updates(monkeypatch):
    updates = []
    monkeypatch.setattr(
        lab_gemini,
        "update_profile",
        lambda *args, **kwargs: updates.append(kwargs),
    )
    return updates


def test_translate_error_quota(profile_updates):
    error = provider_mod.LabGeminiProvider._translate_error(
        _api_error(429, "429 RESOURCE_EXHAUSTED: quota exceeded")
    )

    assert isinstance(error, lab_gemini.GeminiQuotaExceeded)
    assert profile_updates[-1]["last_state"] == "quota"
    assert profile_updates[-1]["needs_attention"] is True


def test_translate_error_permission_denied_is_invalid_key(profile_updates):
    error = provider_mod.LabGeminiProvider._translate_error(
        _api_error(403, "403 PERMISSION_DENIED")
    )

    assert isinstance(error, lab_gemini.GeminiKeyInvalid)
    assert profile_updates[-1]["last_state"] == "invalid"


def test_translate_error_invalid_key_message(profile_updates):
    error = provider_mod.LabGeminiProvider._translate_error(
        _api_error(400, "API key not valid. Please pass a valid API key.")
    )

    assert isinstance(error, lab_gemini.GeminiKeyInvalid)


def test_translate_error_generic_400_is_not_invalid_key(profile_updates):
    error = provider_mod.LabGeminiProvider._translate_error(
        _api_error(400, "INVALID_ARGUMENT: request contains too many tokens")
    )

    assert isinstance(error, RuntimeError)
    assert not isinstance(error, lab_gemini.GeminiKeyInvalid)
    assert profile_updates == []


def test_translate_error_server_error_is_runtime(profile_updates):
    error = provider_mod.LabGeminiProvider._translate_error(
        _api_error(500, "INTERNAL: unexpected failure")
    )

    assert isinstance(error, RuntimeError)
    assert profile_updates == []


# ==============================================================================
# Generate & streaming
# ==============================================================================

def test_generation_config_passes_parameters():
    provider = _provider(temperature=0.2, top_p=0.9, top_k=32, max_output_tokens=128)

    config = provider._generation_config("instruksi", ["STOP"])

    assert config.system_instruction == "instruksi"
    assert config.temperature == pytest.approx(0.2)
    assert config.top_p == pytest.approx(0.9)
    assert config.top_k == 32
    assert config.max_output_tokens == 128
    assert list(config.stop_sequences) == ["STOP"]


def test_generate_returns_text_and_records_usage(monkeypatch):
    recorded = []
    monkeypatch.setattr(
        provider_mod.LabGeminiProvider,
        "_record_usage",
        staticmethod(lambda usage: recorded.append(usage)),
    )

    client = _FakeClient(response=_response("Halo dari Gemini", prompt=6, output=3))
    monkeypatch.setattr(provider_mod.LabGeminiProvider, "_client", lambda self: client)

    result = _provider()._generate([HumanMessage(content="Hai")])

    assert result.generations[0].message.content == "Halo dari Gemini"
    assert recorded and recorded[0].prompt_token_count == 6
    call = client.models.calls[0]
    assert call["model"] == "gemini-2.5-flash"
    assert call["contents"][0].role == "user"


def test_generate_translates_client_error(monkeypatch):
    client = _FakeClient(error=_api_error(429, "429 RESOURCE_EXHAUSTED"))
    monkeypatch.setattr(provider_mod.LabGeminiProvider, "_client", lambda self: client)
    monkeypatch.setattr(lab_gemini, "update_profile", lambda *a, **k: None)

    with pytest.raises(lab_gemini.GeminiQuotaExceeded):
        _provider()._generate([HumanMessage(content="Hai")])


def test_stream_yields_chunks_and_records_last_usage(monkeypatch):
    recorded = []
    monkeypatch.setattr(
        provider_mod.LabGeminiProvider,
        "_record_usage",
        staticmethod(lambda usage: recorded.append(usage)),
    )

    chunks = [
        _response("Hel", prompt=2, output=1),
        _response("lo", prompt=2, output=2),
        _response("", prompt=2, output=2, thoughts=1),
    ]
    client = _FakeClient(chunks=chunks)
    monkeypatch.setattr(provider_mod.LabGeminiProvider, "_client", lambda self: client)

    output = [
        generation.message.content
        for generation in _provider()._stream([HumanMessage(content="Hai")])
    ]

    assert output == ["Hel", "lo"]
    assert recorded[0].prompt_token_count == 2
    assert recorded[0].candidates_token_count == 2
    assert recorded[0].thoughts_token_count == 1


def test_stream_translates_client_error(monkeypatch):
    client = _FakeClient(error=_api_error(429, "429 RESOURCE_EXHAUSTED"))
    monkeypatch.setattr(provider_mod.LabGeminiProvider, "_client", lambda self: client)
    monkeypatch.setattr(lab_gemini, "update_profile", lambda *a, **k: None)

    with pytest.raises(lab_gemini.GeminiQuotaExceeded):
        list(_provider()._stream([HumanMessage(content="Hai")]))


def test_agenerate_returns_text_and_records_usage(monkeypatch):
    recorded = []
    monkeypatch.setattr(
        provider_mod.LabGeminiProvider,
        "_record_usage",
        staticmethod(lambda usage: recorded.append(usage)),
    )

    async_models = _FakeAsyncModels(response=_response("Halo async", prompt=5, output=2))
    client = _FakeClient()
    client.aio = SimpleNamespace(models=async_models)
    monkeypatch.setattr(provider_mod.LabGeminiProvider, "_client", lambda self: client)

    result = asyncio.run(_provider()._agenerate([HumanMessage(content="Hai")]))

    assert result.generations[0].message.content == "Halo async"
    assert recorded and recorded[0].prompt_token_count == 5
    assert async_models.calls[0]["model"] == "gemini-2.5-flash"


def test_astream_yields_chunks_and_records_usage(monkeypatch):
    recorded = []
    monkeypatch.setattr(
        provider_mod.LabGeminiProvider,
        "_record_usage",
        staticmethod(lambda usage: recorded.append(usage)),
    )

    async_models = _FakeAsyncModels(chunks=[
        _response("A", prompt=1, output=1),
        _response("B", prompt=1, output=2),
    ])
    client = _FakeClient()
    client.aio = SimpleNamespace(models=async_models)
    monkeypatch.setattr(provider_mod.LabGeminiProvider, "_client", lambda self: client)

    async def collect():
        return [
            generation.message.content
            async for generation in _provider()._astream([HumanMessage(content="Hai")])
        ]

    assert asyncio.run(collect()) == ["A", "B"]
    assert recorded and recorded[0].candidates_token_count == 2


def test_astream_translates_client_error(monkeypatch):
    async_models = _FakeAsyncModels(error=_api_error(429, "429 RESOURCE_EXHAUSTED"))
    client = _FakeClient()
    client.aio = SimpleNamespace(models=async_models)
    monkeypatch.setattr(provider_mod.LabGeminiProvider, "_client", lambda self: client)
    monkeypatch.setattr(lab_gemini, "update_profile", lambda *a, **k: None)

    async def collect():
        return [
            generation
            async for generation in _provider()._astream([HumanMessage(content="Hai")])
        ]

    with pytest.raises(lab_gemini.GeminiQuotaExceeded):
        asyncio.run(collect())


# ==============================================================================
# Konfigurasi Jupyter AI
# ==============================================================================

def test_lab_ai_config_is_locked_to_lab_gemini():
    fragment_path = REPO_ROOT / "config" / "lab_ai_config.py"
    namespace = {}

    class _Section:
        pass

    class _Config:
        def __init__(self):
            self.AiExtension = _Section()

    namespace["get_config"] = _Config
    exec(compile(fragment_path.read_text(encoding="utf-8"), str(fragment_path), "exec"), namespace)
    ai_config = namespace["c"].AiExtension

    assert ai_config.allowed_providers == ["lab-gemini"]
    assert ai_config.default_language_model == "lab-gemini:gemini-2.5-flash"
    assert ai_config.default_max_chat_history >= 1
