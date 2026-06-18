# ws_server.py — WebSocket server wrapper.
#
# Thin abstraction over the `websockets` library so main.py
# doesn't have to know about server lifecycle details.

from __future__ import annotations

import asyncio
import websockets
from websockets.asyncio.server import ServerConnection

from config import WS_HOST, WS_PORT


async def serve(handler) -> None:
    """Start the WebSocket server and block until the process is killed.

    Parameters
    ----------
    handler : async callable (websocket) → None
        Called once per accepted client connection.
        When the client disconnects the coroutine should return cleanly.
    """
    print(f"[WS] Server starting → ws://{WS_HOST}:{WS_PORT}")
    async with websockets.serve(handler, WS_HOST, WS_PORT):
        print("[WS] Listening — waiting for frontend connection …")
        await asyncio.Future()   # run forever
