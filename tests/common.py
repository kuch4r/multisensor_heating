"""Shared helpers for integration tests."""

from typing import Any

from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.multisensor_heating.const import DEFAULT_PARAMS, DOMAIN

TRV = "climate.living_trv"
HIGH = "sensor.living_high"
WINDOW = "binary_sensor.living_window"
WINDOW2 = "binary_sensor.living_window_2"
LOCK = "lock.living_trv_lock"
ENTRY_ID = "living_entry"
STORE_KEY = f"{DOMAIN}.{ENTRY_ID}"


def set_trv(hass: HomeAssistant, current=19.0, target=19.0, mode="heat",
            hvac_modes=("off", "heat", "auto"), **attrs: Any) -> None:
    hass.states.async_set(
        TRV, mode,
        {"current_temperature": current, "temperature": target, "hvac_modes": list(hvac_modes),
         **attrs},
    )


SALUS_PRESETS = ("Follow Schedule", "Permanent Hold", "Off")
PRESET_TO_HVAC = {"Off": "off", "Permanent Hold": "heat", "Follow Schedule": "auto"}


def set_salus_trv(hass: HomeAssistant, preset="Permanent Hold", current=19.0, target=19.0) -> None:
    """A TRV3RF as exposed by the leonardpitzu Salus integration (with presets)."""
    set_trv(hass, current=current, target=target, mode=PRESET_TO_HVAC[preset],
            preset_mode=preset, preset_modes=list(SALUS_PRESETS))


def eid(hass: HomeAssistant, domain: str, key: str, entry: MockConfigEntry) -> str | None:
    return er.async_get(hass).async_get_entity_id(domain, DOMAIN, f"{entry.entry_id}_{key}")


async def setup_room(hass: HomeAssistant, **options: Any) -> MockConfigEntry:
    """Create the default test room (TRV + HIGH sensor + WINDOW + LOCK) and set it up."""
    if hass.states.get(TRV) is None:
        set_trv(hass)
    hass.states.async_set(HIGH, "20.0", {"device_class": "temperature", "friendly_name": "High"})
    if hass.states.get(WINDOW) is None:
        hass.states.async_set(WINDOW, "off", {"device_class": "window"})
    hass.states.async_set(LOCK, "unlocked")
    entry = MockConfigEntry(
        domain=DOMAIN,
        entry_id=ENTRY_ID,
        title="Living",
        unique_id=TRV,
        data={"name": "Living", "trv_entity": TRV},
        options={
            **DEFAULT_PARAMS,
            "temp_sensors": [HIGH],
            "window_sensors": [WINDOW],
            "reference_sensor": HIGH,
            "lock_entity": LOCK,
            **options,
        },
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def flaky_service(hass: HomeAssistant, domain: str, service: str, fail_times: int) -> list[ServiceCall]:
    """Register a service that raises for the first ``fail_times`` calls, then succeeds."""
    calls: list[ServiceCall] = []

    async def handler(call: ServiceCall) -> None:
        calls.append(call)
        if len(calls) <= fail_times:
            raise HomeAssistantError("gateway timeout")

    hass.services.async_register(domain, service, handler)
    return calls
