"""Provider Gemini untuk Jupyter AI (JupyterLab) di Lab AI UMPO.

Provider ini sengaja dibuat kecil dan tidak memakai ``langchain-google-genai``
karena paket tersebut menarik SDK Google generasi lama yang bentrok dengan
``protobuf``/TensorFlow di ``/opt/ai_env``. Sebagai gantinya, provider memakai
``google-genai`` yang sudah terpasang untuk helper notebook.

API key dibaca langsung dari ``~/.config/gemini/api_key`` setiap request. Jadi:

- key tetap satu sumber (modal Gemini di JupyterLab);
- key tidak pernah ditulis ke config Jupyter AI, localStorage, atau notebook;
- pergantian key langsung dipakai tanpa restart server;
- pemakaian token chat ikut tercatat di ``~/.config/gemini/usage.json``.
"""

from __future__ import annotations

import logging
from typing import Any, AsyncIterator, Iterator, List, Optional, Sequence

from jupyter_ai_magics.base_provider import BaseProvider
from jupyter_ai_magics.models.persona import Persona
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import (
    AIMessage,
    AIMessageChunk,
    BaseMessage,
    HumanMessage,
    SystemMessage,
)
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult

import lab_gemini

logger = logging.getLogger(__name__)


# ==============================================================================
# Utilitas pesan
# ==============================================================================

def _text_from_content(content: Any) -> str:
    """Ambil teks dari content LangChain (str atau list blok multimodal)."""
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, (list, tuple)):
        chunks: List[str] = []
        for block in content:
            if isinstance(block, str):
                chunks.append(block)
            elif isinstance(block, dict):
                text = block.get("text")
                if text:
                    chunks.append(str(text))
            else:
                text = getattr(block, "text", None)
                if text:
                    chunks.append(str(text))
        return "".join(chunks)
    return str(content)


def _message_text(message: BaseMessage) -> str:
    return _text_from_content(getattr(message, "content", ""))


def messages_to_contents(messages: Sequence[BaseMessage]) -> tuple[list[Any], str]:
    """Konversi pesan LangChain ke ``google.genai`` contents + system prompt.

    Pesan dengan role sama yang berurutan digabung karena Gemini mengharapkan
    percakapan berselang-seling user/model.
    """
    from google.genai import types

    system_parts: List[str] = []
    contents: List[Any] = []

    for message in messages:
        text = _message_text(message).strip()
        if not text:
            continue

        if isinstance(message, SystemMessage):
            system_parts.append(text)
            continue

        if isinstance(message, HumanMessage):
            role = "user"
        elif isinstance(message, AIMessage):
            role = "model"
        else:
            # Tool/function/other messages: kirim sebagai user agar konteks tidak hilang.
            role = "user"

        if contents and contents[-1].role == role:
            contents[-1].parts.append(types.Part(text=text))
        else:
            contents.append(types.Content(role=role, parts=[types.Part(text=text)]))

    return contents, "\n\n".join(system_parts)


def _response_text(response: Any) -> str:
    """Ambil teks jawaban, abaikan bagian 'thought' Gemini."""
    parts: List[str] = []
    for candidate in getattr(response, "candidates", None) or []:
        content = getattr(candidate, "content", None)
        for part in getattr(content, "parts", None) or []:
            if getattr(part, "thought", False):
                continue
            text = getattr(part, "text", None)
            if text:
                parts.append(text)
    return "".join(parts)


def _usage_counts(usage: Any) -> tuple[int, int]:
    if not usage:
        return 0, 0
    prompt = int(getattr(usage, "prompt_token_count", 0) or 0)
    output = int(getattr(usage, "candidates_token_count", 0) or 0)
    output += int(getattr(usage, "thoughts_token_count", 0) or 0)
    return max(0, prompt), max(0, output)


# ==============================================================================
# Provider
# ==============================================================================

class LabGeminiProvider(BaseProvider, BaseChatModel):
    """Gemini lewat AI Studio key milik masing-masing mahasiswa."""

    id = "lab-gemini"
    name = "Gemini"
    models = [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
    ]
    model_id_key = "model_id"
    auth_strategy = None
    persona = Persona(
        name="Gemini",
        avatar_route="api/ai/static/jupyternaut.svg",
    )
    help = (
        "Gemini untuk Lab AI UMPO. API key dibaca dari modal Gemini "
        "(~/.config/gemini/api_key), bukan dari Settings Jupyter AI."
    )

    # Parameter opsional; bisa diatur lewat AiExtension.model_parameters.
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    top_k: Optional[int] = None
    max_output_tokens: Optional[int] = None

    @property
    def _llm_type(self) -> str:
        return "lab-gemini"

    @property
    def _identifying_params(self) -> dict[str, Any]:
        return {"model_id": self.model_id}

    # ------------------------------------------------------------------
    # Key & client
    # ------------------------------------------------------------------

    @staticmethod
    def _api_key() -> str:
        key = lab_gemini.read_key()
        if not key:
            raise lab_gemini.GeminiKeyMissing(
                "Key Gemini belum diatur. Buka modal kunci Gemini di JupyterLab "
                "(chip kunci di kanan bawah), lalu simpan API key AI Studio."
            )
        return key

    def _client(self):
        from google import genai

        return genai.Client(api_key=self._api_key())

    def _generation_config(self, system_instruction: str, stop: Optional[List[str]]):
        from google.genai import types

        kwargs: dict[str, Any] = {}
        if system_instruction:
            kwargs["system_instruction"] = system_instruction
        if self.temperature is not None:
            kwargs["temperature"] = float(self.temperature)
        if self.top_p is not None:
            kwargs["top_p"] = float(self.top_p)
        if self.top_k is not None:
            kwargs["top_k"] = int(self.top_k)
        if self.max_output_tokens is not None:
            kwargs["max_output_tokens"] = int(self.max_output_tokens)
        if stop:
            kwargs["stop_sequences"] = list(stop)
        return types.GenerateContentConfig(**kwargs)

    @staticmethod
    def _record_usage(usage: Any) -> None:
        prompt, output = _usage_counts(usage)
        if prompt <= 0 and output <= 0:
            return
        try:
            lab_gemini.add_usage(prompt_tokens=prompt, output_tokens=output)
        except Exception:  # jangan sampai kegagalan statistik memutus chat
            logger.debug("Gagal mencatat token Gemini", exc_info=True)

    @staticmethod
    def _translate_error(exc: Exception) -> Exception:
        """Petakan error Google ke exception yang ramah untuk mahasiswa.

        Hanya error yang benar-benar soal key yang dipetakan ke
        ``GeminiKeyInvalid``. HTTP 400 generik (mis. prompt terlalu panjang
        atau argumen tidak valid) tidak boleh disalahartikan sebagai key salah.
        """
        message = str(exc)
        code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
        try:
            code = int(code) if code is not None else None
        except (TypeError, ValueError):
            code = None
        upper = message.upper()

        if (
            code == 429
            or "RESOURCE_EXHAUSTED" in upper
            or "QUOTA EXCEEDED" in upper
            or "RATE LIMIT" in upper
        ):
            try:
                lab_gemini.update_profile(
                    needs_attention=True,
                    last_state="quota",
                    last_error=message[:300],
                )
            except Exception:
                pass
            return lab_gemini.GeminiQuotaExceeded(
                "Kuota key Gemini sedang habis. Ganti key di modal kunci Gemini "
                "atau coba lagi besok."
            )

        key_rejected = (
            code in (401, 403)
            or "API_KEY_INVALID" in upper
            or "API KEY NOT VALID" in upper
            or "API KEY EXPIRED" in upper
            or "API KEY IS INVALID" in upper
            or "UNAUTHENTICATED" in upper
            or "PERMISSION_DENIED" in upper
        )
        if key_rejected:
            try:
                lab_gemini.update_profile(
                    needs_attention=True,
                    last_state="invalid",
                    last_error=message[:300],
                )
            except Exception:
                pass
            return lab_gemini.GeminiKeyInvalid(
                "Key Gemini ditolak Google. Buka modal kunci Gemini dan simpan "
                "API key AI Studio yang valid."
            )

        return RuntimeError(f"Gemini gagal memproses permintaan: {message}")

    # ------------------------------------------------------------------
    # Non-streaming
    # ------------------------------------------------------------------

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> ChatResult:
        contents, system_instruction = messages_to_contents(messages)
        config = self._generation_config(system_instruction, stop)
        client = self._client()

        try:
            response = client.models.generate_content(
                model=self.model_id,
                contents=contents,
                config=config,
            )
        except Exception as exc:
            raise self._translate_error(exc) from exc

        self._record_usage(getattr(response, "usage_metadata", None))
        return ChatResult(
            generations=[ChatGeneration(message=AIMessage(content=_response_text(response)))]
        )

    async def _agenerate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> ChatResult:
        contents, system_instruction = messages_to_contents(messages)
        config = self._generation_config(system_instruction, stop)
        client = self._client()

        try:
            response = await client.aio.models.generate_content(
                model=self.model_id,
                contents=contents,
                config=config,
            )
        except Exception as exc:
            raise self._translate_error(exc) from exc

        self._record_usage(getattr(response, "usage_metadata", None))
        return ChatResult(
            generations=[ChatGeneration(message=AIMessage(content=_response_text(response)))]
        )

    # ------------------------------------------------------------------
    # Streaming
    # ------------------------------------------------------------------

    def _stream(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> Iterator[ChatGenerationChunk]:
        contents, system_instruction = messages_to_contents(messages)
        config = self._generation_config(system_instruction, stop)
        client = self._client()
        usage = None

        try:
            stream = client.models.generate_content_stream(
                model=self.model_id,
                contents=contents,
                config=config,
            )
            for chunk in stream:
                usage = getattr(chunk, "usage_metadata", None) or usage
                text = _response_text(chunk)
                if not text:
                    continue
                if run_manager:
                    run_manager.on_llm_new_token(text)
                yield ChatGenerationChunk(message=AIMessageChunk(content=text))
        except Exception as exc:
            raise self._translate_error(exc) from exc
        finally:
            self._record_usage(usage)

    async def _astream(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> AsyncIterator[ChatGenerationChunk]:
        contents, system_instruction = messages_to_contents(messages)
        config = self._generation_config(system_instruction, stop)
        client = self._client()
        usage = None

        try:
            stream = await client.aio.models.generate_content_stream(
                model=self.model_id,
                contents=contents,
                config=config,
            )
            async for chunk in stream:
                usage = getattr(chunk, "usage_metadata", None) or usage
                text = _response_text(chunk)
                if not text:
                    continue
                if run_manager:
                    run_manager.on_llm_new_token(text)
                yield ChatGenerationChunk(message=AIMessageChunk(content=text))
        except Exception as exc:
            raise self._translate_error(exc) from exc
        finally:
            self._record_usage(usage)


# ==============================================================================
# Pesan error yang ramah di panel chat
# ==============================================================================

def _install_friendly_errors() -> None:
    """Tampilkan pesan key/quota langsung, tanpa traceback Python.

    Ini shim kecil yang dipasang saat provider diimpor. Aman jika API internal
    Jupyter AI berubah: kegagalan patch diabaikan dan chat tetap berjalan.
    """
    try:
        from jupyter_ai.chat_handlers.base import BaseChatHandler

        if getattr(BaseChatHandler, "_lab_gemini_patched", False):
            return

        original = BaseChatHandler._default_handle_exc

        async def _default_handle_exc(self, exc, message):
            if isinstance(
                exc,
                (
                    lab_gemini.GeminiKeyMissing,
                    lab_gemini.GeminiKeyInvalid,
                    lab_gemini.GeminiQuotaExceeded,
                ),
            ):
                self.reply(str(exc), message)
                return
            await original(self, exc, message)

        BaseChatHandler._default_handle_exc = _default_handle_exc
        BaseChatHandler._lab_gemini_patched = True
    except Exception:
        logger.debug("Tidak dapat memasang pesan error Gemini yang ramah", exc_info=True)


_install_friendly_errors()
