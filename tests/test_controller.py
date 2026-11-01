"""Unit tests for the pure control algorithm."""

from dataclasses import replace

from custom_components.multisensor_heating.controller import (
    ControlInput,
    ControlState,
    RoomSettings,
    SensorInput,
    TrvState,
    decide,
)

SETTINGS = RoomSettings(target=21.0)
TRV = TrvState(available=True, hvac_mode="heat", current_temperature=19.0, target_temperature=19.0)


def run(sensors, *, settings=SETTINGS, trv=TRV, state=None, now=1000.0, window_since=None):
    return decide(
        ControlInput(
            now=now,
            settings=settings,
            trv=trv,
            sensors=sensors,
            window_open_since=window_since,
            state=state or ControlState(),
        )
    )


def test_cold_sensor_heats_proportionally():
    d = run([SensorInput("trv", 19.0, offset=-2.0), SensorInput("high", 20.0)])
    assert d.reason == "heating"
    assert d.deficit == 1.0
    # trv 19 + gain 2 * deficit 1 = 21
    assert d.set_temperature == 21.0


def test_bigger_gap_bigger_setpoint():
    small = run([SensorInput("high", 20.5)]).set_temperature
    big = run([SensorInput("high", 18.0)]).set_temperature
    assert big > small


def test_min_boost_and_rounding_up():
    d = run([SensorInput("high", 20.7)])
    assert d.reason == "heating"
    # deficit 0.3 * 2 = 0.6 < min boost 1.0 -> 19 + 1 = 20
    assert d.set_temperature == 20.0
    d = run([SensorInput("high", 20.0)], settings=replace(SETTINGS, gain=1.3))
    # 19 + 1.3 = 20.3 -> rounded up to 20.5
    assert d.set_temperature == 20.5


def test_cold_wins_over_reached():
    """Heating comes first: one sensor below its target keeps heating on, even if
    another sensor has already passed its target."""
    d = run([SensorInput("trv", 19.0), SensorInput("high", 21.5)])
    assert d.reason == "heating"
    assert d.heating
    assert d.sensors["high"].status == "hot"
    assert d.sensors["trv"].status == "cold"


def test_stops_only_when_every_sensor_reached_its_target():
    sensors = [SensorInput("trv", 21.3), SensorInput("high", 21.5)]
    heating = ControlState(heating=True, reason="heating", last_write=900.0)
    d = run(sensors, state=heating)
    assert d.reason == "idle"
    assert not d.heating
    assert d.set_temperature == 17.0


def test_dead_band_keeps_heating_until_all_reached():
    # "high" reached its target, "trv" is inside its hysteresis band (not reached yet).
    sensors = [SensorInput("trv", 21.0), SensorInput("high", 21.5)]
    heating = ControlState(heating=True, reason="heating", last_write=900.0)
    assert run(sensors, state=heating).heating
    idle = ControlState(heating=False, reason="idle")
    assert not run(sensors, state=idle).heating


def test_above_max_blocks_heating():
    # Offset says target 23 and another sensor is cold, but max 21.5 is crossed -> stop.
    d = run([SensorInput("trv", 17.0), SensorInput("high", 21.6, offset=2.0, max_temp=21.5)])
    assert d.reason == "above_max"
    assert not d.heating
    assert d.sensors["high"].status == "above_max"


def test_below_min_forces_heating():
    # Offset says target 18 and another sensor is far above target, but min 20 not reached.
    d = run([SensorInput("trv", 25.0), SensorInput("high", 19.5, offset=-3.0, min_temp=20.0)])
    assert d.reason == "below_min"
    assert d.heating
    assert d.sensors["high"].status == "below_min"
    assert d.sensors["high"].effective_target == 20.25


def test_below_min_wins_over_above_max():
    d = run([SensorInput("trv", 26.0, max_temp=25.0), SensorInput("high", 15.0, min_temp=16.0)])
    assert d.reason == "below_min"
    assert d.heating


def test_heating_continues_to_target_after_min_recovered():
    # Back above min (16) but still below target: keep heating until the target is reached.
    state = ControlState(heating=True, reason="below_min", last_write=900.0)
    d = run([SensorInput("high", 16.5, min_temp=16.0)], state=state)
    assert d.reason == "heating"
    assert d.heating


def test_vacation_ignores_min_and_max():
    d = run([SensorInput("high", 5.0, min_temp=16.0)], settings=replace(SETTINGS, away=True))
    assert d.reason == "vacation"
    assert d.set_temperature == 10.0


def test_off_and_window_ignore_min():
    sensors = [SensorInput("high", 5.0, min_temp=16.0)]
    assert run(sensors, settings=replace(SETTINGS, hvac_on=False)).reason == "room_off"
    assert run(sensors, window_since=0.0).reason == "window_open"


def test_setpoint_clamped():
    d = run([SensorInput("high", 10.0)])
    assert d.set_temperature == 30.0


def test_idle_skips_write_when_trv_already_closed():
    trv = replace(TRV, current_temperature=21.0, target_temperature=18.0)
    d = run([SensorInput("high", 22.0)], trv=trv)
    assert d.reason == "idle"
    assert d.set_temperature is None


def test_rate_limit_and_state_change():
    sensors = [SensorInput("high", 19.0)]
    state = ControlState(heating=True, reason="heating", last_write=950.0)
    trv = replace(TRV, target_temperature=25.0)
    assert run(sensors, trv=trv, state=state).set_temperature is None
    assert run(sensors, trv=trv, state=state, now=1200.0).set_temperature == 23.0
    # Flip to idle -> immediate write despite rate limit.
    d = run([SensorInput("high", 22.0)], trv=trv, state=state)
    assert d.set_temperature == 17.0


def test_heating_tolerance_avoids_small_rewrites():
    state = ControlState(heating=True, reason="heating", last_write=0.0)
    trv = replace(TRV, target_temperature=20.5)
    d = run([SensorInput("high", 20.0)], trv=trv, state=state)
    assert d.requested_setpoint == 20.5
    assert d.set_temperature is None


def test_window_open_after_delay_holds_minimum_setpoint():
    sensors = [SensorInput("high", 19.0)]
    assert run(sensors, window_since=950.0).reason == "heating"
    d = run(sensors, window_since=880.0)
    assert d.reason == "window_open"
    assert d.window_blocked
    assert not d.heating
    assert d.set_hvac_mode is None  # never switched off, stays in heat
    assert d.set_temperature == 5.0


def test_window_closed_resumes_heating():
    trv = replace(TRV, target_temperature=5.0)
    state = ControlState(reason="window_open", last_write=900.0)
    d = run([SensorInput("high", 19.0)], trv=trv, state=state)
    assert d.reason == "heating"
    assert d.set_temperature > 5.0


def test_trv_switched_off_is_switched_back_to_heat():
    """Also while blocked: an "off" TRV3RF may still be heating (HoldType 7)."""
    trv = replace(TRV, hvac_mode="off")
    d = run([SensorInput("high", 19.0)], trv=trv, window_since=0.0)
    assert d.set_hvac_mode == "heat"


def test_hvac_request_not_repeated_while_gateway_lags():
    trv = replace(TRV, hvac_mode="auto")
    state = ControlState(reason="heating", last_hvac_request="heat", last_hvac_write=980.0)
    d = run([SensorInput("high", 19.0)], trv=trv, state=state)
    assert d.set_hvac_mode is None
    d = run([SensorInput("high", 19.0)], trv=trv, state=state, now=1100.0)
    assert d.set_hvac_mode == "heat"


def test_auto_mode_switched_to_heat():
    d = run([SensorInput("high", 19.0)], trv=replace(TRV, hvac_mode="auto"))
    assert d.set_hvac_mode == "heat"


def test_vacation_holds_fixed_temperature_ignoring_sensors():
    d = run([SensorInput("high", 15.0)], settings=replace(SETTINGS, away=True))
    assert d.reason == "vacation"
    assert d.set_temperature == 10.0


def test_room_off_holds_minimum_setpoint():
    d = run([SensorInput("high", 15.0)], settings=replace(SETTINGS, hvac_on=False))
    assert d.reason == "room_off"
    assert not d.heating
    assert d.set_hvac_mode is None
    assert d.set_temperature == 5.0


def test_disabled_does_nothing():
    d = run([SensorInput("high", 15.0)], settings=replace(SETTINGS, enabled=False),
            trv=replace(TRV, hvac_mode="auto"))
    assert d.reason == "disabled"
    assert d.set_hvac_mode is None
    assert d.set_temperature is None


def test_unavailable_sensors_ignored_and_fail_safe():
    d = run([SensorInput("high", None), SensorInput("trv", 19.0)])
    assert d.reason == "heating"
    assert d.sensors["high"].status == "unavailable"
    d = run([SensorInput("high", None)])
    assert d.reason == "no_sensors"
    assert d.set_temperature == 21.0


def test_trv_unavailable():
    d = run([SensorInput("high", 15.0)], trv=TrvState(available=False))
    assert d.reason == "trv_unavailable"
    assert d.set_temperature is None
