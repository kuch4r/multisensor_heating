"""Constants for Multi-Sensor Heating."""

from __future__ import annotations

from typing import Final

DOMAIN: Final = "multisensor_heating"

CONF_NAME: Final = "name"
CONF_TRV: Final = "trv_entity"
CONF_LOCK: Final = "lock_entity"
CONF_TEMP_SENSORS: Final = "temp_sensors"
CONF_WINDOW_SENSORS: Final = "window_sensors"
CONF_REFERENCE: Final = "reference_sensor"
CONF_MIN_BOOST: Final = "min_boost"
CONF_STOP_MARGIN: Final = "stop_margin"
CONF_WINDOW_DELAY: Final = "window_delay"
CONF_MIN_WRITE_INTERVAL: Final = "min_write_interval"
CONF_MIN_SETPOINT: Final = "min_setpoint"
CONF_MAX_SETPOINT: Final = "max_setpoint"
CONF_STALE_TIMEOUT: Final = "stale_timeout"

DEFAULT_PARAMS: Final = {
    CONF_MIN_BOOST: 1.0,
    CONF_STOP_MARGIN: 2.0,
    CONF_WINDOW_DELAY: 120,
    CONF_MIN_WRITE_INTERVAL: 180,
    CONF_MIN_SETPOINT: 5.0,
    CONF_MAX_SETPOINT: 30.0,
    CONF_STALE_TIMEOUT: 120,
}

DEFAULT_TARGET: Final = 21.0
DEFAULT_GAIN: Final = 2.0
DEFAULT_HYSTERESIS: Final = 0.5
DEFAULT_VACATION_TEMP: Final = 10.0
DEFAULT_SENSOR_MIN: Final = 5.0
DEFAULT_SENSOR_MAX: Final = 30.0

MODE_HEAT: Final = "heat"
MODE_VACATION: Final = "vacation"
MODE_OFF: Final = "off"
MODE_DISABLED: Final = "disabled"
MODES: Final = [MODE_HEAT, MODE_VACATION, MODE_OFF, MODE_DISABLED]

EVALUATE_INTERVAL_S: Final = 60
STATS_WINDOW_H: Final = 24
STATS_SAMPLE_S: Final = 300

REASON_DISABLED: Final = "disabled"
REASON_TRV_UNAVAILABLE: Final = "trv_unavailable"
REASON_WINDOW_OPEN: Final = "window_open"
REASON_VACATION: Final = "vacation"
REASON_ROOM_OFF: Final = "room_off"
REASON_NO_SENSORS: Final = "no_sensors"
REASON_HEATING: Final = "heating"
REASON_IDLE: Final = "idle"
REASONS: Final = [
    REASON_DISABLED,
    REASON_TRV_UNAVAILABLE,
    REASON_WINDOW_OPEN,
    REASON_VACATION,
    REASON_ROOM_OFF,
    REASON_NO_SENSORS,
    REASON_HEATING,
    REASON_IDLE,
]

FRONTEND_URL: Final = "/multisensor_heating_frontend"
FRONTEND_FILE: Final = "multisensor-heating.js"
