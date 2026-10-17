import { LitElement, css, html, nothing } from "lit";
import { STATUS, fireEvent, fmt, getRooms, navigate, num, openWindows, roomReason, slug } from "./api";
import type { HomeAssistant, RoomInfo } from "./types";

export interface OverviewConfig {
  type: string;
  title?: string;
  rooms?: string[];
  tap_action?: "more-info" | "navigate" | "none";
}

export class OverviewCard extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _rooms: { state: true },
    _error: { state: true },
  };

  declare hass: HomeAssistant;
  declare _config: OverviewConfig;
  declare _rooms?: RoomInfo[];
  declare _error?: string;
  private _loading = false;

  static getConfigElement(): HTMLElement {
    return document.createElement("multisensor-heating-overview-card-editor");
  }

  static getStubConfig(): Partial<OverviewConfig> {
    return { title: "Heating" };
  }

  setConfig(config: OverviewConfig): void {
    this._config = { tap_action: "more-info", ...config };
  }

  getCardSize(): number {
    return 1 + Math.ceil((this._rooms?.length ?? 2) / 2) * 2;
  }

  protected updated(): void {
    if (this.hass && !this._rooms && !this._loading) void this._load();
  }

  private async _load(): Promise<void> {
    this._loading = true;
    try {
      const rooms = await getRooms(this.hass);
      const filter = this._config.rooms;
      this._rooms = filter?.length
        ? rooms.filter((r) => filter.includes(r.entry_id) || filter.includes(r.name))
        : rooms;
    } catch (err) {
      this._error = `Multi-Sensor Heating not available: ${(err as Error).message ?? err}`;
    } finally {
      this._loading = false;
    }
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;
    return html`
      <ha-card .header=${this._config.title}>
        <div class="grid">
          ${this._error
            ? html`<div class="msg">${this._error}</div>`
            : !this._rooms
              ? html`<div class="msg">Loading…</div>`
              : this._rooms.length === 0
                ? html`<div class="msg">No rooms configured yet. Add one in Settings → Devices & services.</div>`
                : this._rooms.map((room) => this._tile(room))}
        </div>
      </ha-card>
    `;
  }

  private _tile(room: RoomInfo) {
    const hass = this.hass;
    const climateId = room.entities.climate;
    const climate = climateId ? hass.states[climateId] : undefined;
    const status = STATUS[roomReason(hass, room)] ?? STATUS.unknown;
    const current = num(hass, climateId, "current_temperature");
    const target = num(hass, climateId, "temperature");
    const trvTemp = num(hass, room.trv_entity, "current_temperature");
    const trvSet = num(hass, room.trv_entity, "temperature");
    const windows = openWindows(hass, room);
    const automationOff = room.entities.automation && hass.states[room.entities.automation]?.state === "off";
    const locked = room.lock_entity && hass.states[room.lock_entity]?.state === "locked";
    const delta = current != null && target != null ? current - target : undefined;

    return html`
      <div class="tile" style="--status-color:${status.color}" @click=${() => this._tap(room)}>
        <div class="top">
          <span class="name">${room.name}</span>
          <span class="chip"><ha-icon .icon=${status.icon}></ha-icon>${status.label}</span>
        </div>
        <div class="temps">
          <span class="current">${fmt(current)}<span class="unit">°C</span></span>
          ${delta != null
            ? html`<span class="delta ${delta < 0 ? "cold" : "warm"}">${delta > 0 ? "+" : ""}${delta.toFixed(1)}</span>`
            : nothing}
        </div>
        <div class="target-row" @click=${(e: Event) => e.stopPropagation()}>
          <button class="step" aria-label="Lower target" @click=${() => this._step(climateId, target, -0.5)}>
            <ha-icon icon="mdi:minus"></ha-icon>
          </button>
          <span class="target">Target <b>${fmt(target)}°</b></span>
          <button class="step" aria-label="Raise target" @click=${() => this._step(climateId, target, 0.5)}>
            <ha-icon icon="mdi:plus"></ha-icon>
          </button>
        </div>
        <div class="foot">
          <span title="TRV temperature → TRV setpoint"><ha-icon icon="mdi:radiator"></ha-icon>
            ${fmt(trvTemp)}° → ${fmt(trvSet)}°</span>
          <span class="icons">
            ${windows.length ? html`<ha-icon class="warn" icon="mdi:window-open-variant" title="Window open"></ha-icon>` : nothing}
            ${automationOff ? html`<ha-icon icon="mdi:robot-off" title="Automation disabled"></ha-icon>` : nothing}
            ${locked ? html`<ha-icon icon="mdi:lock" title="TRV locked"></ha-icon>` : nothing}
            ${climate?.attributes.preset_mode === "away" ? html`<ha-icon icon="mdi:beach" title="Vacation"></ha-icon>` : nothing}
          </span>
        </div>
      </div>
    `;
  }

  private _step(climateId: string | null, target: number | undefined, delta: number): void {
    if (!climateId || target == null) return;
    void this.hass.callService("climate", "set_temperature", {
      entity_id: climateId,
      temperature: Math.min(30, Math.max(5, target + delta)),
    });
  }

  private _tap(room: RoomInfo): void {
    if (this._config.tap_action === "navigate") {
      const base = window.location.pathname.split("/").filter(Boolean)[0] ?? "lovelace";
      navigate(`/${base}/${slug(room.name)}`);
    } else if (this._config.tap_action !== "none" && room.entities.climate) {
      fireEvent(this, "hass-more-info", { entityId: room.entities.climate });
    }
  }

  static styles = css`
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
      padding: 12px 16px 16px;
    }
    ha-card:not([header]) .grid,
    ha-card .grid:first-child {
      padding-top: 16px;
    }
    .msg {
      color: var(--secondary-text-color);
      padding: 8px 0;
    }
    .tile {
      position: relative;
      cursor: pointer;
      border-radius: 12px;
      padding: 12px 14px;
      background: color-mix(in srgb, var(--status-color) 8%, var(--card-background-color, #fff));
      border: 1px solid color-mix(in srgb, var(--status-color) 35%, transparent);
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: transform 0.1s ease;
    }
    .tile:hover {
      transform: translateY(-1px);
    }
    .top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .name {
      font-weight: 600;
      font-size: 1.05em;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75em;
      font-weight: 600;
      padding: 2px 8px 2px 6px;
      border-radius: 10px;
      color: var(--status-color);
      background: color-mix(in srgb, var(--status-color) 15%, transparent);
      white-space: nowrap;
      --mdc-icon-size: 14px;
    }
    .temps {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .current {
      font-size: 2.2em;
      font-weight: 300;
      line-height: 1.1;
    }
    .unit {
      font-size: 0.45em;
      color: var(--secondary-text-color);
      margin-left: 2px;
    }
    .delta {
      font-size: 0.85em;
      font-weight: 600;
    }
    .delta.cold {
      color: var(--info-color, #039be5);
    }
    .delta.warm {
      color: var(--state-climate-heat-color, #ff8100);
    }
    .target-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: default;
    }
    .step {
      border: none;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--primary-text-color);
      background: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
      --mdc-icon-size: 18px;
    }
    .step:hover {
      background: color-mix(in srgb, var(--primary-text-color) 16%, transparent);
    }
    .target {
      color: var(--secondary-text-color);
    }
    .target b {
      color: var(--primary-text-color);
      font-size: 1.1em;
    }
    .foot {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85em;
      color: var(--secondary-text-color);
      --mdc-icon-size: 16px;
    }
    .icons {
      display: inline-flex;
      gap: 4px;
    }
    .warn {
      color: var(--info-color, #039be5);
    }
  `;
}
