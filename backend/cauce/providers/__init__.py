import os

from .ollama import OllamaProvider


def get_provider():
    kind = os.getenv("CAUCE_PROVIDER", "ollama")
    if kind == "ollama":
        return OllamaProvider(
            model=os.getenv("CAUCE_MODEL", "llama3.2:3b"),
            host=os.getenv("OLLAMA_HOST", "http://localhost:11434"),
        )
    raise ValueError(f"Proveedor de IA desconocido: {kind}")
