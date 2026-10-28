"""WebSocket Hub for Real-Time Pushes to Frontend Clients.

Supports broadcasting to channels:
- forecast.updated
- alert.created
- job.progress
- source.health
"""

import json
from typing import Dict, Set, Any
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # channel_name -> set of WebSockets
        self.active_connections: Dict[str, Set[WebSocket]] = {
            "all": set(),
            "forecast.updated": set(),
            "alert.created": set(),
            "job.progress": set(),
            "source.health": set(),
        }

    async def connect(self, websocket: WebSocket, channel: str = "all"):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = set()
        self.active_connections[channel].add(websocket)
        self.active_connections["all"].add(websocket)

    def disconnect(self, websocket: WebSocket, channel: str = "all"):
        if channel in self.active_connections and websocket in self.active_connections[channel]:
            self.active_connections[channel].remove(websocket)
        if websocket in self.active_connections["all"]:
            self.active_connections["all"].remove(websocket)

    async def broadcast(self, channel: str, message: Dict[str, Any]):
        """Broadcast payload to all sockets subscribed to channel."""
        payload = json.dumps({
            "channel": channel,
            "data": message
        })
        targets = list(self.active_connections.get(channel, set()))
        for connection in targets:
            try:
                await connection.send_text(payload)
            except Exception:
                self.disconnect(connection, channel)


ws_hub = ConnectionManager()
