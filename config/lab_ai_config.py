# === BEGIN LAB AI CHAT ===
# Dikelola oleh deploy_simtik.sh. Jangan edit manual.
# Chat Jupyter AI hanya boleh memakai provider lab-gemini (key per mahasiswa).
c = get_config()  # noqa: F821
c.AiExtension.allowed_providers = ["lab-gemini"]
c.AiExtension.default_language_model = "lab-gemini:gemini-3.8-flash"
c.AiExtension.default_max_chat_history = 4
# === END LAB AI CHAT ===
