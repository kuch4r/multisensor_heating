"""Regression tests for findings of the logic review (one section per finding)."""

from datetime import timedelta
from unittest.mock import patch

import pytest
from homeassistant.config_entries import ConfigEntryDisabler
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.multisensor_heating import coordinator as coordinator_module
from custom_components.multisensor_heating.const import DEFAULT_PARAMS
from custom_components.multisensor_heating.controller import (
    ControlInput,
    ControlState,
    RoomSettings,
    SensorInput,
    TrvState,
    decide,
)

from .common import (
    HIGH,
    STORE_KEY,
    TRV,
    WINDOW,
    WINDOW2,
    eid,
    flaky_service,
    set_trv,
    setup_room,
)


async def advance(hass: HomeAssistant, freezer, seconds: float) -> None:
    freezer.tick(timedelta(seconds=seconds))
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()


async def turn_off_automation(hass: HomeAssistant, entry) -> None:
    await hass.services.async_call(
        "switch", "turn_off", {"entity_id": eid(hass, "switch", "enabled", entry)}, blocking=True
    )


def hvac_modes(calls) -> list[str]:
    return [c.data["hvac_mode"] for c in calls]


# ---- H1: kill switch hand-over must be reliable -------------------------------------


async def test_h1_kill_switch_retries_handover_when_call_fails(hass, entry, freezer):
    hvac = flaky_service(hass, "climate", "set_hvac_mode", fail_times=1)
    await turn_off_automation(hass, entry)
    assert hvac_modes(hvac) == ["auto"]
    await advance(hass, freezer, 61)
    assert hvac_modes(hvac) == ["auto", "auto"], "failed hand-over to Salus schedule was not retried"


async def test_h1_kill_switch_without_auto_mode_sets_safe_setpoint(hass, calls):
    set_trv(hass, target=23.0, hvac_modes=("off", "heat"))
    entry = await setup_room(hass)
    await turn_off_automation(hass, entry)
    written = [c.data["temperature"] for c in calls["temp"]]
    assert written[-1:] == [DEFAULT_PARAMS["min_setpoint"]], (
        f"TRV without 'auto' mode was left at a boosted setpoint (writes: {written})"
    )


async def test_h1_guard_no_fighting_user_after_successful_handover(hass, entry, calls, freezer):
    await turn_off_automation(hass, entry)
    set_trv(hass, mode="auto")
    await advance(hass, freezer, 61)
    set_trv(hass, mode="heat", target=22.0)  # user takes manual control while automation is off
    n = len(calls["hvac"])
    await advance(hass, freezer, 180)
    assert len(calls["hvac"]) == n


# ---- H2: removing / disabling a room hands the TRV back -----------------------------


async def _room_off(hass, entry, calls):
    await entry.runtime_data.async_set_setting("hvac_on", False)
    assert hvac_modes(calls["hvac"])[-1] == "off"
    set_trv(hass, mode="off")
    await hass.async_block_till_done()


async def test_h2_remove_entry_hands_trv_back_to_schedule(hass, entry, calls):
    await _room_off(hass, entry, calls)
    await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()
    assert hvac_modes(calls["hvac"])[-1] == "auto", "removed room left the TRV switched off"


async def test_h2_disable_entry_hands_trv_back_to_schedule(hass, entry, calls):
    await _room_off(hass, entry, calls)
    await hass.config_entries.async_set_disabled_by(entry.entry_id, ConfigEntryDisabler.USER)
    await hass.async_block_till_done()
    assert hvac_modes(calls["hvac"])[-1] == "auto", "disabled room left the TRV switched off"


async def test_h2_guard_reload_does_not_hand_over(hass, entry, calls):
    await _room_off(hass, entry, calls)
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert "auto" not in hvac_modes(calls["hvac"])


# ---- H3: failed setpoint writes are retried promptly --------------------------------


async def test_h3_failed_setpoint_write_retried_on_next_tick(hass, calls, freezer):
    temp = flaky_service(hass, "climate", "set_temperature", fail_times=1)
    await setup_room(hass)
    assert len(temp) == 1
    await advance(hass, freezer, 61)
    assert len(temp) == 2, "failed setpoint write was not retried before min_write_interval"


# ---- M1: window timer measured from the first window opening ------------------------


async def step_seconds(hass: HomeAssistant, freezer, seconds: int) -> None:
    """Advance in small steps so timers fire when they would in real life."""
    for _ in range(seconds // 5):
        await advance(hass, freezer, 5)


async def test_m1_second_window_does_not_delay_block(hass, calls, freezer):
    hass.states.async_set(WINDOW2, "off", {"device_class": "window"})
    await setup_room(hass, window_sensors=[WINDOW, WINDOW2])
    await step_seconds(hass, freezer, 30)
    hass.states.async_set(WINDOW, "on", {"device_class": "window"})
    await step_seconds(hass, freezer, 60)
    hass.states.async_set(WINDOW2, "on", {"device_class": "window"})
    # Window 1 has been open 120 s at t=150; the 60 s tick only runs at t=180.
    await step_seconds(hass, freezer, 65)
    assert "off" in hvac_modes(calls["hvac"]), "block delayed by the second window opening"


# ---- M2: hvac_action while automation is disabled ----------------------------------


async def test_m2_hvac_action_mirrors_trv_when_disabled(hass, entry):
    set_trv(hass, hvac_action="heating")
    await turn_off_automation(hass, entry)
    climate = hass.states.get(eid(hass, "climate", "climate", entry))
    assert climate.attributes["hvac_action"] == "heating"


# ---- M3: fail-safe must not resurrect a manually switched-off TRV -------------------


def _no_sensor_input(state: ControlState) -> ControlInput:
    return ControlInput(
        now=1000.0,
        settings=RoomSettings(target=21.0),
        trv=TrvState(available=True, hvac_mode="off", current_temperature=None,
                     target_temperature=7.0),
        sensors=[SensorInput("high", None)],
        window_open_since=None,
        state=state,
    )


def test_m3_fail_safe_leaves_manual_off_alone():
    d = decide(_no_sensor_input(ControlState(reason="heating", last_hvac_request="heat")))
    assert d.reason == "no_sensors"
    assert d.set_temperature == 21.0
    assert d.set_hvac_mode is None, "fail-safe switched a manually-off TRV back to heat"


def test_m3_guard_fail_safe_restores_heat_after_our_own_off():
    d = decide(_no_sensor_input(ControlState(reason="window_open", last_hvac_request="off")))
    assert d.set_hvac_mode == "heat"


# ---- M4: state persisted right after TRV writes ------------------------------------


async def test_m4_state_saved_immediately_after_hvac_write(hass, entry, calls, hass_storage):
    await _room_off(hass, entry, calls)
    saved = hass_storage.get(STORE_KEY, {}).get("data", {})
    assert saved.get("control_state", {}).get("last_hvac_request") == "off", (
        "control state not persisted after switching the TRV off"
    )


# ---- M5: min must not exceed max ---------------------------------------------------


async def _set(hass, entity_id, value):
    await hass.services.async_call(
        "number", "set_value", {"entity_id": entity_id, "value": value}, blocking=True
    )


async def test_m5_min_above_max_rejected(hass, entry):
    min_id, max_id = eid(hass, "number", f"{HIGH}_min", entry), eid(hass, "number", f"{HIGH}_max", entry)
    await _set(hass, max_id, 23.0)
    with pytest.raises(ServiceValidationError):
        await _set(hass, min_id, 25.0)
    assert hass.states.get(min_id).state == "5.0"


async def test_m5_max_below_min_rejected(hass, entry):
    min_id, max_id = eid(hass, "number", f"{HIGH}_min", entry), eid(hass, "number", f"{HIGH}_max", entry)
    await _set(hass, min_id, 20.0)
    with pytest.raises(ServiceValidationError):
        await _set(hass, max_id, 18.0)
    assert hass.states.get(max_id).state == "30.0"


# ---- L1: bursts of state changes are coalesced -------------------------------------


async def test_l1_state_change_burst_is_debounced(hass, freezer, entry):
    # `freezer` before `entry`: the room is set up on the frozen clock, so the
    # periodic 60 s evaluation does not fire during the 5 s window below.
    with patch.object(coordinator_module, "decide", wraps=coordinator_module.decide) as spy:
        for i in range(10):
            hass.states.async_set(HIGH, str(20.0 + i / 100), {"device_class": "temperature"})
        await hass.async_block_till_done()
        await advance(hass, freezer, 5)
    assert spy.call_count <= 2, f"{spy.call_count} evaluations for one burst of 10 updates"


# ---- L2: stale TRV temperature ------------------------------------------------------


async def test_l2_stale_trv_temperature_ignored(hass, entry, freezer):
    await advance(hass, freezer, (DEFAULT_PARAMS["stale_timeout"] + 1) * 60)
    hass.states.async_set(HIGH, "20.0", {"device_class": "temperature"}, force_update=True)
    await hass.async_block_till_done()
    climate = hass.states.get(eid(hass, "climate", "climate", entry))
    assert climate.attributes["sensors"][TRV]["status"] == "unavailable"


# ---- L3: window block survives an HA restart ----------------------------------------


async def test_l3_window_block_survives_restart(hass, calls, hass_storage):
    hass_storage[STORE_KEY] = {
        "version": 1,
        "minor_version": 1,
        "key": STORE_KEY,
        "data": {
            "settings": {},
            "sensors": {},
            "control_state": {"heating": False, "reason": "window_open",
                              "last_hvac_request": "off", "last_hvac_write": 0.0},
        },
    }
    set_trv(hass, mode="off")
    # After a restart the window state is restored "just now", i.e. last_changed is fresh.
    hass.states.async_set(WINDOW, "on", {"device_class": "window"})
    entry = await setup_room(hass)
    assert "heat" not in hvac_modes(calls["hvac"]), "TRV re-enabled after restart with window open"
    assert hass.states.get(eid(hass, "sensor", "control_reason", entry)).state == "window_open"


# ---- L7: options flow can clear all sensors ----------------------------------------


async def test_l7_options_flow_clears_sensors_when_fields_omitted(hass, entry):
    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(result["flow_id"], {})
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"reference_sensor": TRV}
    )
    await hass.config_entries.options.async_configure(result["flow_id"], DEFAULT_PARAMS)
    await hass.async_block_till_done()
    assert entry.options["temp_sensors"] == []
    assert entry.options["window_sensors"] == []
