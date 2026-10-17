# Multi-Sensor Heating for Home Assistant

Room heating control for radiator thermostats (TRVs, built and tested for **Salus TRV-3 via
the Salus iT600 integration**, but any HA `climate` TRV works) using **extra temperature
sensors** placed higher in the room and **window sensors**.

TRVs sit next to the radiator near the floor, so their own reading is often not what the room
feels like. This integration decides *whether and how hard* to heat from all sensors in the
room and steers the TRV by writing a setpoint **above** its own reading (heat; bigger gap =
more heat) or **below** it (stop).

## Features

- One room = one TRV + any number of temperature sensors (Zigbee, Matter, Wi-Fi… any
  `sensor` with device class temperature) + any number of window/door sensors.
- **Room target** with a per-sensor **offset** (main control) and per-sensor **min/max safety
  range** (backup in case an offset is wrong).
- **"Too hot wins"**: heating runs while any sensor is cold and stops as soon as any sensor is hot.
- **Proportional heating**: `TRV setpoint = TRV temp + max(min boost, gain × deficit)`.
- **Window blocking**: any window open longer than 2 min (configurable) → TRV `Off`;
  closed → back to `Heat`.
- **Kill switch** per room: hands the TRV back to its Salus schedule (`Auto`).
- **Vacation preset**: TRV holds a fixed temperature (default 10 °C), sensors ignored.
- **TRV child lock** (optional) plus automatic correction of manual setpoint changes.
- **Suggested offsets** computed from the last 24 h of data relative to a **reference sensor**.
- **Bundled dashboard**: overview tiles for every room and a room card with an offset/range
  editor, suggestions and a history chart. No extra HACS frontend cards required.
- Battery-friendly: TRV writes are rate-limited (default ≥ 3 min apart) and skipped when the
  current setpoint is already close enough.

## Installation

### HACS (custom repository)
1. HACS → ⋮ → *Custom repositories* → add `https://github.com/kuch4r/multisensor_heating`
   as type *Integration*.
2. Install **Multi-Sensor Heating**, restart Home Assistant.

### Manual
Copy `custom_components/multisensor_heating` into your HA `config/custom_components/`
directory and restart Home Assistant.

## Setup

Settings → Devices & services → **Add integration** → *Multi-Sensor Heating*. Add one entry per room:

1. **Room**: name and the TRV `climate` entity.
2. **Sensors**: extra temperature sensors, window/door sensors and optionally the TRV
   child-lock `lock` entity. The TRV's own temperature is always included.
3. **Reference sensor**: the sensor that best represents how the room feels. It is shown as
   the room temperature and offset suggestions are relative to it.
4. **Parameters**: defaults are fine to start with.

Use *Configure* on the entry later to add or remove sensors.

## Dashboard

The cards are loaded automatically. There are two ways to use them:

**Ready-made dashboard (recommended).** Settings → Dashboards → *Add dashboard* → *New
dashboard from scratch*. Open it, then ⋮ → *Edit dashboard* → ⋮ → *Raw configuration editor*
and replace the content with:

```yaml
strategy:
  type: custom:multisensor-heating
```

This creates an **Overview** page with a tile per room. Tapping a tile opens the room page.
New rooms appear automatically.

**Individual cards.** Add *Multi-Sensor Heating: Overview* or *Multi-Sensor Heating: Room*
from the card picker, or in YAML:

```yaml
type: custom:multisensor-heating-overview-card
title: Heating
tap_action: more-info   # more-info | navigate | none
---
type: custom:multisensor-heating-room-card
entry_id: <config entry id>   # or: room: Living room
show_chart: true
hours: 24
```

## How it works

For every sensor *i*:

```
effective_target_i = clamp(room_target + offset_i, min_i + h/2, max_i − h/2)
cold_i  : temp_i ≤ effective_target_i − h/2
hot_i   : temp_i ≥ effective_target_i + h/2          (h = hysteresis, default 0.5 °C)
deficit = max over sensors of (effective_target_i − temp_i)
```

- any sensor hot → **idle**: TRV setpoint = TRV temp − stop margin (2 °C);
- else any sensor cold → **heating**: TRV setpoint = TRV temp + max(min boost 1 °C, gain × deficit);
- else → keep the previous state (dead band).

Setpoints are rounded to 0.5 °C and clamped to 5–30 °C. Order of precedence: automation off →
TRV unavailable → window open → room off → vacation → normal control. If no sensor has data,
the TRV is set to the room target and a Repairs issue is raised.

Extra sensors that have not reported for 120 min (configurable) are ignored.

## Tuning guide

1. Start with all offsets at 0 and a wide range (min 5, max 30) on every sensor.
2. After a day, open the room card. **Suggested offset** shows how much warmer (+) or colder (−)
   each sensor typically reads than the reference sensor. Press **Apply**. The TRV usually
   ends up at around −1 to −3 °C.
3. Set **min/max** a bit outside the normal range as a safety net, e.g. reference sensor
   min 18 / max 23.
4. If rooms heat up too slowly, raise **gain** (Tuning section). If they overshoot, lower it
   or raise **hysteresis**.
5. Use HA automations or a scheduler card to change the room climate target over the day.
   Do not schedule the TRV itself.

## Entities per room

| Entity | Purpose |
|---|---|
| `climate.<room>` | Room target, Heat/Off, preset `away` (vacation). Attributes: reason, per-sensor status |
| `number.<room>_<sensor>_offset/_min/_max` | Per-sensor settings (offset carries suggestion attributes) |
| `number.<room>_gain/_hysteresis/_vacation_temperature` | Tuning |
| `switch.<room>_automation` | Kill switch |
| `switch.<room>_trv_lock` | Keep the TRV child lock engaged (only if a lock entity is configured) |
| `binary_sensor.<room>_heating` / `_window_blocked` | Heating demand / window blocking |
| `sensor.<room>_control_reason`, `_heat_deficit`, `_requested_trv_setpoint`, `_<sensor>_effective_target` | Diagnostics and chart history |

## Development

```bash
python3.14 -m venv .venv && .venv/bin/pip install -r requirements_dev.txt
.venv/bin/ruff check . && .venv/bin/pytest

npm ci
npm run typecheck && npm run build   # writes custom_components/multisensor_heating/frontend/
```

The built JS bundle is committed so that HACS and manual installs work without Node.
