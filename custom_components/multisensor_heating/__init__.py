"""Multi-Sensor Heating: room heating control using a TRV plus extra sensors."""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.typing import ConfigType

from . import websocket_api
from .const import DOMAIN, FRONTEND_FILE, FRONTEND_URL
from .coordinator import RoomController

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [
    Platform.BINARY_SENSOR,
    Platform.CLIMATE,
    Platform.NUMBER,
    Platform.SENSOR,
    Platform.SWITCH,
]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

type RoomConfigEntry = ConfigEntry[RoomController]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register websocket API and the bundled dashboard cards once."""
    websocket_api.async_register(hass)
    frontend_file = Path(__file__).parent / "frontend" / FRONTEND_FILE
    if hass.http is None or "frontend" not in hass.config.components:
        return True
    if frontend_file.exists():
        version = int(frontend_file.stat().st_mtime)
        await hass.http.async_register_static_paths(
            [StaticPathConfig(FRONTEND_URL, str(frontend_file.parent), False)]
        )
        add_extra_js_url(hass, f"{FRONTEND_URL}/{FRONTEND_FILE}?v={version}")
    else:
        _LOGGER.warning("Dashboard bundle missing: %s", frontend_file)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: RoomConfigEntry) -> bool:
    controller = RoomController(hass, entry)
    await controller.async_setup()
    entry.runtime_data = controller
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    _remove_orphan_entities(hass, entry, controller.unique_ids)
    entry.async_on_unload(entry.add_update_listener(_async_reload))
    await controller.async_evaluate()
    return True


async def async_unload_entry(hass: HomeAssistant, entry: RoomConfigEntry) -> bool:
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        await entry.runtime_data.async_unload()
    return unloaded


async def _async_reload(hass: HomeAssistant, entry: RoomConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


def _remove_orphan_entities(hass: HomeAssistant, entry: ConfigEntry, keep: set[str]) -> None:
    """Remove entities of sensors that were removed in the options flow."""
    reg = er.async_get(hass)
    for ent in er.async_entries_for_config_entry(reg, entry.entry_id):
        if ent.unique_id not in keep:
            reg.async_remove(ent.entity_id)
