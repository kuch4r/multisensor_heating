import { LitElement, css, html, nothing } from "lit";
import {
  MODES,
  RETRY_MS,
  SENSOR_STATUS,
  STATUS,
  roomMode,
  setRoomMode,
  fireEvent,
  fmt,
  fmtSigned,
  getHistory,
  getRooms,
  num,
  roomReason,
  sinceText,
} from "./api";
import { PALETTE } from "./history-chart";
import type { HomeAssistant, RoomHistory, RoomInfo, RoomSensor, SensorStatus } from "./types";

export interface RoomCardConfig {
  type: string;
  entry_id?: string;
  room?: string;
  show_chart?: boolean;
  hours?: number;
}

const HISTORY_REFRESH_MS = 5 * 60_000;

const REASON_TEXT: Record<string, string> = {
  heating: "At least one sensor is below its target — the TRV setpoint is raised above the TRV's own reading.",
  idle: "Targets reached (or a sensor is above its upper limit) — the TRV setpoint is kept below the TRV's own reading.",
  window_open: "A window has been open longer than the delay — heating is stopped.",
  room_off: "The room is switched off — heating is stopped.",
  vacation: "Vacation mode — the TRV holds the vacation temperature, sensors are ignored.",
  disabled: "Disabled — the room is not controlled; the TRV is left as it is.",
  trv_unavailable: "The TRV is unavailable — nothing is changed.",
  no_sensors: "No temperature data — the TRV is set to the room target as a fail-safe.",
};

export class RoomCard extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _room: { state: true },
    _history: { state: true },
    _hours: { state: true },
    _error: { state: true },
    _historyError: { state: true },
  };

  declare hass: HomeAssistant;
  declare _historyError?: string;
  declare _config: RoomCardConfig;
  declare _room?: RoomInfo;
  declare _history?: RoomHistory;
  declare _hours: number;
  declare _error?: string;
  private _loading = false;
  private _timer?: number;

  static getConfigElement(): HTMLElement {
    return document.createElement("multisensor-heating-room-card-editor");
  }

  static getStubConfig(): Partial<RoomCardConfig> {
    return { show_chart: true, hours: 24 };
  }

  setConfig(config: RoomCardConfig): void {
    this._config = { show_chart: true, hours: 24, ...config };
    this._hours = this._config.hours ?? 24;
    this._room = undefined;
    this._history = undefined;
    this._error = undefined;
  }

  getCardSize(): number {
    return 10;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._timer = window.setInterval(() => void this._loadHistory(), HISTORY_REFRESH_MS);
  }

  disconnectedCallback(): void {
    window.clearInterval(this._timer);
    super.disconnectedCallback();
  }

  protected updated(): void {
    // After an error, _load() schedules its own retry.
    if (this.hass && !this._room && !this._loading && !this._error) void this._load();
  }

  private async _load(): Promise<void> {
    this._loading = true;
    try {
      const rooms = await getRooms(this.hass, true);
      const { entry_id, room } = this._config;
      this._room =
        rooms.find((r) => r.entry_id === entry_id || (room && r.name.toLowerCase() === room.toLowerCase())) ??
        (!entry_id && !room ? rooms[0] : undefined);
      if (!this._room) this._error = "Room not found. Pick a room in the card editor.";
      else {
        this._error = undefined;
        await this._loadHistory();
      }
    } catch (err) {
      this._error = `Multi-Sensor Heating not available: ${(err as Error).message ?? err}`;
    } finally {
      this._loading = false;
    }
    if (this._error) window.setTimeout(() => void this._load(), RETRY_MS);
  }

  private async _loadHistory(): Promise<void> {
    if (!this._room || !this._config.show_chart) return;
    try {
      this._history = await getHistory(this.hass, this._room.entry_id, this._hours);
      this._historyError = undefined;
    } catch (err) {
      this._history = undefined;
      this._historyError = (err as Error).message ?? String(err);
    }
  }

  private _setHours(hours: number): void {
    this._hours = hours;
    this._history = undefined;
    void this._loadHistory();
  }

  // ---- service helpers ----

  private _call(domain: string, service: string, data: Record<string, unknown>): void {
    void this.hass.callService(domain, service, data);
  }

  private _setNumber(entityId: string | null, ev: Event): void {
    const value = parseFloat((ev.target as HTMLInputElement).value);
    if (entityId && Number.isFinite(value)) this._call("number", "set_value", { entity_id: entityId, value });
  }

  private _toggle(entityId: string | null): void {
    if (entityId) this._call("switch", "toggle", { entity_id: entityId });
  }

  private _more(entityId: string | null): void {
    if (entityId) fireEvent(this, "hass-more-info", { entityId });
  }

  // ---- render ----

  protected render() {
    if (!this._config || !this.hass) return nothing;
    if (this._error) return html`<ha-card><div class="pad msg">${this._error}</div></ha-card>`;
    const room = this._room;
    if (!room) return html`<ha-card><div class="pad msg">Loading…</div></ha-card>`;
    const hass = this.hass;
    const e = room.entities;
    const reason = roomReason(hass, room);
    const status = STATUS[reason] ?? STATUS.unknown;
    const target = num(hass, e.climate, "temperature");
    const current = num(hass, e.climate, "current_temperature");
    const mode = roomMode(hass, room);
    const lockOn = e.lock ? hass.states[e.lock]?.state === "on" : false;
    const refName = room.sensors.find((s) => s.is_reference)?.name ?? "reference";

    return html`
      <ha-card style="--status-color:${status.color}">
        <div class="header">
          <div class="title">${room.name}</div>
          <span class="chip"><ha-icon .icon=${status.icon}></ha-icon>${status.label}</span>
        </div>

        <div class="hero">
          <div class="current" @click=${() => this._more(e.climate)}>
            <div class="big">${fmt(current)}<span class="unit">°C</span></div>
            <div class="sub">${refName}</div>
          </div>
          <div class="target">
            <button class="round" aria-label="Lower target"
              @click=${() => target != null && this._call("climate", "set_temperature", { entity_id: e.climate, temperature: Math.max(5, target - 0.5) })}>
              <ha-icon icon="mdi:minus"></ha-icon>
            </button>
            <div class="target-value"><div class="mid">${fmt(target)}°</div><div class="sub">target</div></div>
            <button class="round" aria-label="Raise target"
              @click=${() => target != null && this._call("climate", "set_temperature", { entity_id: e.climate, temperature: Math.min(30, target + 0.5) })}>
              <ha-icon icon="mdi:plus"></ha-icon>
            </button>
          </div>
          <div class="toggles">
            <div class="modes" role="radiogroup" aria-label="Room mode">
              ${MODES.map(
                (m) => html`<button
                  role="radio"
                  aria-checked=${mode === m.value}
                  class="mode ${mode === m.value ? "active" : ""}"
                  style="--mode-color:${m.color}"
                  title=${m.title}
                  @click=${() => mode !== m.value && setRoomMode(hass, room, m.value)}
                >
                  <ha-icon .icon=${m.icon}></ha-icon>${m.label}
                </button>`,
              )}
            </div>
            ${e.lock
              ? html`<button class="pill ${lockOn ? "on" : ""}" @click=${() => this._toggle(e.lock)}>
                  <ha-icon icon=${lockOn ? "mdi:lock" : "mdi:lock-open-variant"}></ha-icon>TRV lock
                </button>`
              : nothing}
          </div>
        </div>

        <div class="reason">${REASON_TEXT[reason] ?? ""}</div>
        ${this._facts(room)}
        ${this._sensorTable(room)}
        ${this._tuning(room)}
        ${this._config.show_chart ? this._chart(room) : nothing}
      </ha-card>
    `;
  }

  private _facts(room: RoomInfo) {
    const hass = this.hass;
    const e = room.entities;
    const trvTemp = num(hass, room.trv_entity, "current_temperature");
    const trvSet = num(hass, room.trv_entity, "temperature");
    const trvMode = hass.states[room.trv_entity]?.state;
    const requested = num(hass, e.requested_setpoint);
    const deficit = num(hass, e.deficit);
    return html`
      <div class="facts">
        <div class="fact clickable" @click=${() => this._more(room.trv_entity)}>
          <span class="label">TRV</span><span>${fmt(trvTemp)}° → <b>${fmt(trvSet)}°</b> <small>(${trvMode ?? "?"})</small></span>
        </div>
        <div class="fact"><span class="label">Requested setpoint</span><span>${fmt(requested)}°</span></div>
        <div class="fact"><span class="label">Heat deficit</span><span>${fmtSigned(deficit)}°</span></div>
        ${room.windows.map((w) => {
          const st = hass.states[w];
          const open = st?.state === "on";
          return html`<div class="fact clickable ${open ? "open" : ""}" @click=${() => this._more(w)}>
            <span class="label"><ha-icon icon=${open ? "mdi:window-open-variant" : "mdi:window-closed-variant"}></ha-icon>${st?.attributes.friendly_name ?? w}</span>
            <span>${open ? `open ${sinceText(st!.last_changed)}` : "closed"}</span>
          </div>`;
        })}
      </div>
    `;
  }

  private _sensorTable(room: RoomInfo) {
    const hass = this.hass;
    const statuses = (room.entities.climate ? hass.states[room.entities.climate]?.attributes.sensors : undefined) as
      | Record<string, SensorStatus>
      | undefined;
    return html`
      <div class="section">
        <div class="section-title">Sensors</div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sensor</th>
                <th>Now</th>
                <th>Target</th>
                <th>Status</th>
                <th title="Added to the room target for this sensor">Offset</th>
                <th title="Safety floor: always heat below this">Min</th>
                <th title="Safety ceiling: always stop above this">Max</th>
                <th title="24 h average difference to the reference sensor">Suggested offset</th>
                <th title="Difference to the reference sensor over the last 24 h">24 h Δ min…max</th>
              </tr>
            </thead>
            <tbody>
              ${room.sensors.map((s, i) => this._sensorRow(s, i, statuses?.[s.entity_id]))}
            </tbody>
          </table>
        </div>
        <div class="hint">
          <b>How to tune:</b> effective target = room target + offset, clamped into [min, max].
          "Suggested offset" is how much warmer (+) or colder (−) a sensor typically reads than the
          reference sensor — applying it makes the reference sensor land on the room target.
          Keep min/max wide as a safety net in case an offset is wrong. Heating runs when any sensor
          is cold and stops as soon as any sensor is hot.
        </div>
      </div>
    `;
  }

  private _sensorRow(s: RoomSensor, index: number, st?: SensorStatus) {
    const hass = this.hass;
    const offset = num(hass, s.offset);
    const min = num(hass, s.min);
    const max = num(hass, s.max);
    const attrs = s.offset ? hass.states[s.offset]?.attributes ?? {} : {};
    const suggested = attrs.suggested_offset as number | null | undefined;
    const sStatus = SENSOR_STATUS[st?.status ?? "unavailable"];
    const diff = suggested != null && offset != null ? Math.abs(suggested - offset) : 0;
    return html`
      <tr>
        <td class="name">
          <span class="dot" style="background:${PALETTE[index % PALETTE.length]}"></span>
          <span class="clickable" @click=${() => this._more(s.entity_id)}>${s.name}</span>
          ${s.is_reference ? html`<span class="tag ref">reference</span>` : nothing}
          ${s.is_trv ? html`<span class="tag">TRV</span>` : nothing}
        </td>
        <td class="numcell"><b>${fmt(st?.temperature)}°</b></td>
        <td class="numcell" title=${st ? `heat ≤ ${fmt(st.lower, 2)}°, stop ≥ ${fmt(st.upper, 2)}°` : ""}>${fmt(st?.effective_target, 2)}°</td>
        <td><span class="badge" style="--c:${sStatus.color}"><ha-icon .icon=${sStatus.icon}></ha-icon>${sStatus.label}</span></td>
        <td>${this._input(s.offset, offset, 0.1)}</td>
        <td>${this._input(s.min, min, 0.5)}</td>
        <td>${this._input(s.max, max, 0.5)}</td>
        <td><span class="suggest">
          ${s.is_reference
            ? html`<span class="muted">—</span>`
            : suggested == null
              ? html`<span class="muted" title="Needs about 1 h of data">collecting…</span>`
              : html`<span>${fmtSigned(suggested)}°</span>
                  ${diff >= 0.1
                    ? html`<button class="apply" @click=${() => this._call("number", "set_value", { entity_id: s.offset, value: suggested })}>Apply</button>`
                    : html`<ha-icon class="ok" icon="mdi:check" title="Offset matches suggestion"></ha-icon>`}`}
        </span></td>
        <td class="numcell muted">
          ${attrs.min_delta_24h != null ? html`${fmtSigned(attrs.min_delta_24h)} … ${fmtSigned(attrs.max_delta_24h)}` : "–"}
        </td>
      </tr>
    `;
  }

  private _input(entityId: string | null, value: number | undefined, step: number) {
    return html`<input
      type="number"
      step=${step}
      .value=${value != null ? String(value) : ""}
      ?disabled=${!entityId}
      @change=${(ev: Event) => this._setNumber(entityId, ev)}
    />`;
  }

  private _tuning(room: RoomInfo) {
    const e = room.entities;
    const field = (label: string, entityId: string | null, step: number, help: string) => html`
      <label class="tune" title=${help}>
        <span>${label}</span>${this._input(entityId, num(this.hass, entityId), step)}
        <small>${help}</small>
      </label>
    `;
    return html`
      <details class="section">
        <summary class="section-title">Tuning</summary>
        <div class="tuning">
          ${field("Gain", e.gain, 0.1, "TRV setpoint = TRV temp + gain × deficit. Higher = heats harder.")}
          ${field("Hysteresis °C", e.hysteresis, 0.1, "Width of the dead band around each target.")}
          ${field("Vacation °C", e.vacation_temp, 0.5, "Fixed TRV temperature in vacation mode.")}
        </div>
      </details>
    `;
  }

  private _chart(room: RoomInfo) {
    return html`
      <div class="section">
        <div class="section-title row">
          <span>History</span>
          <span class="seg">
            ${[24, 72, 168].map(
              (h) => html`<button class=${this._hours === h ? "active" : ""} @click=${() => this._setHours(h)}>
                ${h === 168 ? "7 d" : h === 72 ? "3 d" : "24 h"}
              </button>`,
            )}
          </span>
        </div>
        ${this._historyError
          ? html`<div class="msg">Could not load history: ${this._historyError}</div>`
          : html`<multisensor-heating-chart .history=${this._history} .room=${room}></multisensor-heating-chart>`}
      </div>
    `;
  }

  static styles = css`
    ha-card {
      padding: 16px;
    }
    .pad {
      padding: 16px;
    }
    .msg,
    .muted {
      color: var(--secondary-text-color);
    }
    .clickable {
      cursor: pointer;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .title {
      font-size: 1.5em;
      font-weight: 500;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      padding: 4px 12px 4px 8px;
      border-radius: 14px;
      color: var(--status-color);
      background: color-mix(in srgb, var(--status-color) 15%, transparent);
      --mdc-icon-size: 18px;
    }
    .hero {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px 32px;
      padding: 8px 0;
    }
    .current {
      cursor: pointer;
    }
    .big {
      font-size: 3em;
      font-weight: 300;
      line-height: 1;
    }
    .mid {
      font-size: 1.8em;
      font-weight: 400;
      line-height: 1;
    }
    .unit {
      font-size: 0.4em;
      color: var(--secondary-text-color);
      margin-left: 2px;
    }
    .sub {
      font-size: 0.8em;
      color: var(--secondary-text-color);
      margin-top: 2px;
    }
    .target {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .target-value {
      text-align: center;
      min-width: 70px;
    }
    .round {
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--primary-text-color);
      background: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
    }
    .round:hover {
      background: color-mix(in srgb, var(--primary-text-color) 16%, transparent);
    }
    .toggles {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-left: auto;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 18px;
      padding: 6px 12px 6px 8px;
      background: none;
      color: var(--primary-text-color);
      font: inherit;
      font-size: 0.9em;
      cursor: pointer;
      --mdc-icon-size: 18px;
    }
    .pill.on {
      border-color: var(--primary-color);
      color: var(--primary-color);
      background: color-mix(in srgb, var(--primary-color) 10%, transparent);
    }
    .modes {
      display: inline-flex;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 18px;
      overflow: hidden;
    }
    .mode {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: none;
      border-right: 1px solid var(--divider-color, #e0e0e0);
      padding: 6px 12px 6px 10px;
      background: none;
      color: var(--secondary-text-color);
      font: inherit;
      font-size: 0.9em;
      cursor: pointer;
      --mdc-icon-size: 18px;
    }
    .mode:last-child {
      border-right: none;
    }
    .mode.active {
      color: var(--mode-color);
      background: color-mix(in srgb, var(--mode-color) 14%, transparent);
      font-weight: 600;
    }
    .reason {
      color: var(--secondary-text-color);
      font-size: 0.9em;
      margin: 4px 0 12px;
    }
    .facts {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 8px;
    }
    .fact {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px 10px;
      border-radius: 8px;
      background: color-mix(in srgb, var(--primary-text-color) 4%, transparent);
      --mdc-icon-size: 16px;
    }
    .fact .label {
      font-size: 0.8em;
      color: var(--secondary-text-color);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .fact.open {
      background: color-mix(in srgb, var(--info-color, #039be5) 15%, transparent);
    }
    .section {
      margin-top: 20px;
    }
    .section-title {
      font-weight: 600;
      margin-bottom: 8px;
      cursor: default;
    }
    summary.section-title {
      cursor: pointer;
    }
    .section-title.row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .table-wrap {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9em;
    }
    th {
      text-align: left;
      font-weight: 500;
      font-size: 0.85em;
      color: var(--secondary-text-color);
      padding: 6px 8px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      white-space: nowrap;
    }
    td {
      padding: 6px 8px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      white-space: nowrap;
    }
    tr:last-child td {
      border-bottom: none;
    }
    td.name {
      white-space: normal;
      min-width: 140px;
    }
    .numcell {
      font-variant-numeric: tabular-nums;
    }
    .dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 6px;
      vertical-align: middle;
    }
    .tag {
      font-size: 0.7em;
      padding: 1px 6px;
      border-radius: 8px;
      margin-left: 4px;
      background: color-mix(in srgb, var(--primary-text-color) 10%, transparent);
      color: var(--secondary-text-color);
    }
    .tag.ref {
      background: color-mix(in srgb, var(--primary-color) 15%, transparent);
      color: var(--primary-color);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 0.8em;
      font-weight: 600;
      padding: 2px 8px 2px 5px;
      border-radius: 10px;
      color: var(--c);
      background: color-mix(in srgb, var(--c) 15%, transparent);
      --mdc-icon-size: 14px;
    }
    input[type="number"] {
      width: 64px;
      padding: 4px 6px;
      border: 1px solid var(--divider-color, #ccc);
      border-radius: 6px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
      font: inherit;
    }
    input[type="number"]:focus {
      outline: 2px solid var(--primary-color);
      outline-offset: -1px;
    }
    .suggest {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .apply {
      border: none;
      border-radius: 6px;
      padding: 3px 8px;
      font: inherit;
      font-size: 0.85em;
      cursor: pointer;
      color: var(--text-primary-color, #fff);
      background: var(--primary-color);
    }
    .ok {
      color: var(--success-color, #43a047);
      --mdc-icon-size: 16px;
    }
    .hint {
      font-size: 0.8em;
      color: var(--secondary-text-color);
      margin-top: 8px;
      line-height: 1.4;
    }
    .tuning {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
    }
    .tune {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 4px 8px;
    }
    .tune small {
      grid-column: 1 / -1;
      color: var(--secondary-text-color);
    }
    .seg {
      display: inline-flex;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      overflow: hidden;
    }
    .seg button {
      border: none;
      background: none;
      padding: 4px 10px;
      font: inherit;
      font-size: 0.85em;
      cursor: pointer;
      color: var(--primary-text-color);
    }
    .seg button.active {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
    }
  `;
}
