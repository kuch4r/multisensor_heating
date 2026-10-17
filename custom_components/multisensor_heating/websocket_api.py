"""Websocket API used by the bundled dashboard cards."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntryState
from homeassistant.const import STATE_ON
from homeassistant.core import HomeAssistant, State, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util

from .const import DOMAIN
from .coordinator import RoomController
from .recorder_util import async_get_history, state_number, state_temperature


@callback
def async_register(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_rooms)
    websocket_api.async_register_command(hass, ws_room_history)


def _controllers(hass: HomeAssistant) -> dict[str, RoomController]:
    return {
        entry.entry_id: entry.runtime_data
        for entry in hass.config_entries.async_entries(DOMAIN)
        if entry.state is ConfigEntryState.LOADED
    }


def room_info(hass: HomeAssistant, c: RoomController) -> dict[str, Any]:
    """Room description with the entity ids of everything the cards need."""
    reg = er.async_get(hass)
    entry_id = c.entry.entry_id

    def eid(domain: str, key: str) -> str | None:
        return reg.async_get_entity_id(domain, DOMAIN, f"{entry_id}_{key}")

    return {
        "entry_id": entry_id,
        "name": c.name,
        "trv_entity": c.trv,
        "lock_entity": c.lock_entity,
        "reference_sensor": c.reference,
        "entities": {
            "climate": eid("climate", "climate"),
            "automation": eid("switch", "enabled"),
            "lock": eid("switch", "lock"),
            "window_blocked": eid("binary_sensor", "window_blocked"),
            "heating": eid("binary_sensor", "heating"),
            "reason": eid("sensor", "control_reason"),
            "deficit": eid("sensor", "heat_deficit"),
            "requested_setpoint": eid("sensor", "requested_setpoint"),
            "gain": eid("number", "gain"),
            "hysteresis": eid("number", "hysteresis"),
            "vacation_temp": eid("number", "vacation_temp"),
        },
        "sensors": [
            {
                "entity_id": sid,
                "name": c.sensor_name(sid),
                "is_trv": sid == c.trv,
                "is_reference": sid == c.reference,
                "offset": eid("number", f"{sid}_offset"),
                "min": eid("number", f"{sid}_min"),
                "max": eid("number", f"{sid}_max"),
                "effective_target": eid("sensor", f"{sid}_effective_target"),
            }
            for sid in c.sensor_ids
        ],
        "windows": c.window_sensors,
    }


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/rooms"})
@callback
def ws_rooms(hass: HomeAssistant, connection: websocket_api.ActiveConnection,
             msg: dict[str, Any]) -> None:
    rooms = [room_info(hass, c) for c in _controllers(hass).values()]
    connection.send_result(msg["id"], sorted(rooms, key=lambda r: r["name"].lower()))


def _series(states: list[State], value) -> list[list[float]]:
    points: list[list[float]] = []
    for state in states:
        v = value(state)
        if points and points[-1][1] == v:
            continue
        points.append([round(state.last_updated.timestamp(), 1), v])
    return points


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/room_history",
        vol.Required("entry_id"): str,
        vol.Optional("hours", default=24): vol.All(int, vol.Range(min=1, max=24 * 14)),
    }
)
@websocket_api.async_response
async def ws_room_history(hass: HomeAssistant, connection: websocket_api.ActiveConnection,
                          msg: dict[str, Any]) -> None:
    c = _controllers(hass).get(msg["entry_id"])
    if c is None:
        connection.send_error(msg["id"], "not_found", "Room not found")
        return
    info = room_info(hass, c)
    ents = info["entities"]
    targets = {s["entity_id"]: s["effective_target"] for s in info["sensors"]}
    entity_ids = [
        *c.sensor_ids,
        *[t for t in targets.values() if t],
        *[e for e in (ents["climate"], ents["heating"], ents["window_blocked"]) if e],
    ]
    end = dt_util.utcnow()
    start = end - timedelta(hours=msg["hours"])
    hist = await async_get_history(hass, list(dict.fromkeys(entity_ids)), start)

    def on_off(state: State) -> int:
        return 1 if state.state == STATE_ON else 0

    connection.send_result(
        msg["id"],
        {
            "start": start.timestamp(),
            "end": end.timestamp(),
            "sensors": {sid: _series(hist.get(sid, []), state_temperature) for sid in c.sensor_ids},
            "trv_setpoint": _series(
                hist.get(c.trv, []), lambda s: state_number(s, "temperature")
            ),
            "targets": {
                sid: _series(hist.get(t, []), state_number) for sid, t in targets.items() if t
            },
            "room_target": _series(
                hist.get(ents["climate"], []), lambda s: state_number(s, "temperature")
            ),
            "heating": _series(hist.get(ents["heating"], []), on_off),
            "window": _series(hist.get(ents["window_blocked"], []), on_off),
        },
    )
