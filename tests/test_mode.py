"""Room mode selector: heat / vacation / off / disabled."""

import pytest
from homeassistant.core import HomeAssistant

from .common import TRV, eid, set_trv


async def select_mode(hass: HomeAssistant, entry, mode: str) -> None:
    await hass.services.async_call(
        "select", "select_option",
        {"entity_id": eid(hass, "select", "mode", entry), "option": mode},
        blocking=True,
    )


def mode_state(hass: HomeAssistant, entry) -> str:
    return hass.states.get(eid(hass, "select", "mode", entry)).state


async def test_mode_entity_defaults_to_heat(hass, entry):
    state = hass.states.get(eid(hass, "select", "mode", entry))
    assert state.state == "heat"
    assert state.attributes["options"] == ["heat", "vacation", "off", "disabled"]


async def test_off_switches_trv_off_but_keeps_control(hass, entry, calls):
    await select_mode(hass, entry, "off")
    assert calls["hvac"][-1].data == {"entity_id": TRV, "hvac_mode": "off"}
    assert entry.runtime_data.settings["enabled"] is True
    assert hass.states.get(eid(hass, "sensor", "control_reason", entry)).state == "room_off"


async def test_vacation_holds_vacation_temperature(hass, entry, calls):
    await select_mode(hass, entry, "vacation")
    assert calls["temp"][-1].data == {"entity_id": TRV, "temperature": 10.0}
    assert hass.states.get(eid(hass, "climate", "climate", entry)).attributes["preset_mode"] == "away"


async def test_disabled_leaves_trv_as_is(hass, entry, calls):
    n = {k: len(v) for k, v in calls.items()}
    await select_mode(hass, entry, "disabled")
    assert {k: len(v) for k, v in calls.items()} == n
    assert hass.states.get(eid(hass, "switch", "enabled", entry)).state == "off"
    assert hass.states.get(eid(hass, "sensor", "control_reason", entry)).state == "disabled"


@pytest.mark.parametrize("start", ["off", "vacation", "disabled"])
async def test_heat_restores_permanent_hold_control(hass, entry, calls, start):
    await select_mode(hass, entry, start)
    set_trv(hass, mode="auto" if start == "disabled" else "off" if start == "off" else "heat")
    await select_mode(hass, entry, "heat")
    s = entry.runtime_data.settings
    assert (s["enabled"], s["hvac_on"], s["away"]) == (True, True, False)
    assert hass.states.get(eid(hass, "sensor", "control_reason", entry)).state == "heating"
    if start != "vacation":
        assert calls["hvac"][-1].data == {"entity_id": TRV, "hvac_mode": "heat"}


async def test_mode_reflects_other_controls(hass, entry):
    climate_id = eid(hass, "climate", "climate", entry)
    await hass.services.async_call(
        "climate", "set_preset_mode", {"entity_id": climate_id, "preset_mode": "away"}, blocking=True
    )
    assert mode_state(hass, entry) == "vacation"
    await hass.services.async_call(
        "switch", "turn_off", {"entity_id": eid(hass, "switch", "enabled", entry)}, blocking=True
    )
    assert mode_state(hass, entry) == "disabled"


async def test_switching_modes_evaluates_once(hass, entry, calls):
    await select_mode(hass, entry, "off")
    set_trv(hass, mode="off")
    await hass.async_block_till_done()
    n = len(calls["hvac"])
    await select_mode(hass, entry, "vacation")
    # off -> vacation: one transition straight to heat at the vacation temperature
    assert [c.data["hvac_mode"] for c in calls["hvac"][n:]] == ["heat"]
