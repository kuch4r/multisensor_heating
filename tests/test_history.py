"""Websocket history endpoint against a real recorder."""

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_mock_service
from pytest_homeassistant_custom_component.components.recorder.common import (
    async_wait_recording_done,
)

from custom_components.multisensor_heating.const import DEFAULT_PARAMS, DOMAIN

TRV = "climate.living_trv"
HIGH = "sensor.living_high"
WINDOW = "binary_sensor.living_window"


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(recorder_mock, enable_custom_integrations):
    """The recorder must be set up before hass in this module."""
    return


async def test_ws_room_history(hass: HomeAssistant, hass_ws_client):
    for domain in ("climate", "websocket_api"):
        assert await async_setup_component(hass, domain, {})
    async_mock_service(hass, "climate", "set_temperature")
    async_mock_service(hass, "climate", "set_hvac_mode")
    hass.states.async_set(TRV, "heat", {"current_temperature": 19.0, "temperature": 19.0})
    hass.states.async_set(HIGH, "20.0", {"device_class": "temperature"})
    hass.states.async_set(WINDOW, "off", {"device_class": "window"})
    entry = MockConfigEntry(
        domain=DOMAIN, title="Living", unique_id=TRV,
        data={"name": "Living", "trv_entity": TRV},
        options={**DEFAULT_PARAMS, "temp_sensors": [HIGH], "window_sensors": [WINDOW],
                 "reference_sensor": HIGH},
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    hass.states.async_set(HIGH, "20.5", {"device_class": "temperature"})
    await hass.async_block_till_done()
    await async_wait_recording_done(hass)

    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": f"{DOMAIN}/room_history", "entry_id": entry.entry_id,
                            "hours": 24})
    msg = await client.receive_json()
    assert msg["success"], msg
    result = msg["result"]
    assert [p[1] for p in result["sensors"][HIGH]] == [20.0, 20.5]
    assert result["sensors"][TRV][0][1] == 19.0
    assert result["trv_setpoint"][0][1] == 19.0
    assert result["heating"][-1][1] == 1
    assert result["room_target"][-1][1] == 21.0
    assert result["targets"][HIGH][-1][1] == 21.0
