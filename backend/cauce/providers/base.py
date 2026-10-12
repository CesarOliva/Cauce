"""Interfaz común de proveedores de IA.

Cualquier proveedor (Ollama, una API en la nube, un servidor MCP que exponga
un modelo) implementa estos tres métodos y se elige por configuración.
"""

from __future__ import annotations

from typing import AsyncIterator, Protocol


class Provider(Protocol):
    name: str
    model: str

    async def status(self) -> dict: ...

    async def json(self, system: str, prompt: str, schema: dict | None = None) -> dict: ...

    def stream(self, messages: list[dict]) -> AsyncIterator[str]: ...
