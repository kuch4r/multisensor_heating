"""Integration tests: config flow, entities and TRV control through HA services."""

from datetime import timedelta

import pytest
from homeassistant.config_entries import SOURCE_USER
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.helpers import entity_registry as er
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
    async_mock_service,
)

from custom_components.multisensor_heating.const import DEFAULT_PARAMS, DOMAIN

TRV = "climate.living_trv"
HIGH = "sensor.living_high"
WINDOW = "binary_sensor.living_window"
LOCK = "lock.living_trv_lock"


def set_trv(hass, current=19.0, target=19.0, mode="heat"):
    hass.states.async_set(
        TRV, mode,
        {"current_temperature": current, "temperature": target, "hvac_modes": ["off", "heat", "auto"]},
    )


@pytest.fixture
async def calls(hass: HomeAssistant):
    # Set up real domains first so the mocks below override their services.
    for domain in ("climate", "lock"):
        assert await async_setup_component(hass, domain, {})
    return {
        "temp": async_mock_service(hass, "climate", "set_temperature"),
        "hvac": async_mock_service(hass, "climate", "set_hvac_mode"),
        "lock": async_mock_service(hass, "lock", "lock"),
        "unlock": async_mock_service(hass, "lock", "unlock"),
    }


@pytest.fixture
async def entry(hass: HomeAssistant, calls) -> MockConfigEntry:
    set_trv(hass)
    hass.states.async_set(HIGH, "20.0", {"device_class": "temperature", "friendly_name": "High"})
    hass.states.async_set(WINDOW, "off", {"device_class": "window"})
    hass.states.async_set(LOCK, "unlocked")
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Living",
        unique_id=TRV,
        data={"name": "Living", "trv_entity": TRV},
        options={
            **DEFAULT_PARAMS,
            "temp_sensors": [HIGH],
            "window_sensors": [WINDOW],
            "reference_sensor": HIGH,
            "lock_entity": LOCK,
        },
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def eid(hass, domain, key, entry):
    return er.async_get(hass).async_get_entity_id(domain, DOMAIN, f"{entry.entry_id}_{key}")


async def test_config_flow(hass: HomeAssistant, calls):
    hass.states.async_set(HIGH, "20.0", {"device_class": "temperature"})
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
    assert result["step_id"] == "user"
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"name": "Bedroom", "trv_entity": TRV}
    )
    assert result["step_id"] == "sensors"
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"temp_sensors": [HIGH], "window_sensors": [WINDOW]}
    )
    assert result["step_id"] == "reference"
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"reference_sensor": HIGH}
    )
    assert result["step_id"] == "params"
    result = await hass.config_entries.flow.async_configure(result["flow_id"], DEFAULT_PARAMS)
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["data"] == {"name": "Bedroom", "trv_entity": TRV}
    assert result["options"]["temp_sensors"] == [HIGH]
    assert result["options"]["reference_sensor"] == HIGH


async def test_options_flow_removes_sensor_entities(hass: HomeAssistant, entry):
    assert eid(hass, "number", f"{HIGH}_offset", entry)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"temp_sensors": [], "window_sensors": []}
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"reference_sensor": TRV}
    )
    result = await hass.config_entries.options.async_configure(result["flow_id"], DEFAULT_PARAMS)
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    assert eid(hass, "number", f"{HIGH}_offset", entry) is None
    assert eid(hass, "number", f"{TRV}_offset", entry)


async def test_heats_when_high_sensor_cold(hass: HomeAssistant, entry, calls):
    climate = hass.states.get(eid(hass, "climate", "climate", entry))
    assert climate.attributes["current_temperature"] == 20.0
    assert climate.attributes["hvac_action"] == "heating"
    # The TRV itself (offset 0) is the coldest: deficit 2.0 * gain 2 -> TRV 19 + 4 = 23
    assert calls["temp"][-1].data == {"entity_id": TRV, "temperature": 23.0}
    assert hass.states.get(eid(hass, "sensor", "control_reason", entry)).state == "heating"


async def test_stops_when_sensor_hot(hass: HomeAssistant, entry, calls):
    set_trv(hass, current=19.0, target=21.0)
    hass.states.async_set(HIGH, "21.5", {"device_class": "temperature"})
    await hass.async_block_till_done()
    assert calls["temp"][-1].data["temperature"] == 17.0
    assert hass.states.get(eid(hass, "binary_sensor", "heating", entry)).state == "off"


async def test_offset_number_changes_target(hass: HomeAssistant, entry, calls):
    await hass.services.async_call(
        "number", "set_value",
        {"entity_id": eid(hass, "number", f"{HIGH}_offset", entry), "value": -1.5},
        blocking=True,
    )
    assert hass.states.get(eid(hass, "sensor", f"{HIGH}_effective_target", entry)).state == "19.5"
    assert hass.states.get(eid(hass, "sensor", "control_reason", entry)).state == "idle"


async def test_window_open_blocks_after_delay(hass: HomeAssistant, entry, calls, freezer):
    hass.states.async_set(WINDOW, "on", {"device_class": "window"})
    await hass.async_block_till_done()
    assert not calls["hvac"]
    freezer.tick(timedelta(seconds=125))
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()
    assert calls["hvac"][-1].data == {"entity_id": TRV, "hvac_mode": "off"}
    assert hass.states.get(eid(hass, "binary_sensor", "window_blocked", entry)).state == "on"

    set_trv(hass, mode="off")
    hass.states.async_set(WINDOW, "off", {"device_class": "window"})
    await hass.async_block_till_done()
    assert calls["hvac"][-1].data == {"entity_id": TRV, "hvac_mode": "heat"}


async def test_vacation_preset(hass: HomeAssistant, entry, calls):
    await hass.services.async_call(
        "climate", "set_preset_mode",
        {"entity_id": eid(hass, "climate", "climate", entry), "preset_mode": "away"},
        blocking=True,
    )
    assert calls["temp"][-1].data["temperature"] == 10.0


async def test_kill_switch_hands_over_to_salus(hass: HomeAssistant, entry, calls):
    await hass.services.async_call(
        "switch", "turn_off", {"entity_id": eid(hass, "switch", "enabled", entry)}, blocking=True
    )
    assert calls["hvac"][-1].data == {"entity_id": TRV, "hvac_mode": "auto"}
    n = len(calls["temp"])
    hass.states.async_set(HIGH, "15.0", {"device_class": "temperature"})
    await hass.async_block_till_done()
    assert len(calls["temp"]) == n
    assert hass.states.get(eid(hass, "sensor", "control_reason", entry)).state == "disabled"


async def test_lock_switch_locks_trv(hass: HomeAssistant, entry, calls):
    await hass.services.async_call(
        "switch", "turn_on", {"entity_id": eid(hass, "switch", "lock", entry)}, blocking=True
    )
    assert calls["lock"][-1].data == {"entity_id": LOCK}
    await hass.services.async_call(
        "switch", "turn_off", {"entity_id": eid(hass, "switch", "lock", entry)}, blocking=True
    )
    assert calls["unlock"][-1].data == {"entity_id": LOCK}


async def test_settings_persist_across_reload(hass: HomeAssistant, entry):
    climate_id = eid(hass, "climate", "climate", entry)
    # climate.set_temperature is mocked for the TRV, so set the room target directly.
    await entry.runtime_data.async_set_setting("target", 22.5)
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert hass.states.get(climate_id).attributes["temperature"] == 22.5


async def test_ws_rooms(hass: HomeAssistant, entry, hass_ws_client):
    assert await async_setup_component(hass, "websocket_api", {})
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": f"{DOMAIN}/rooms"})
    msg = await client.receive_json()
    assert msg["success"]
    room = msg["result"][0]
    assert room["name"] == "Living"
    assert room["entities"]["climate"] == eid(hass, "climate", "climate", entry)
    assert [s["entity_id"] for s in room["sensors"]] == [TRV, HIGH]
    assert room["sensors"][1]["is_reference"]
