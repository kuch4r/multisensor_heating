import { LitElement, css, html, nothing, svg } from "lit";
import type { Point, RoomHistory, RoomInfo } from "./types";

export const PALETTE = ["#e8590c", "#1c7ed6", "#2f9e44", "#ae3ec9", "#f08c00", "#0c8599", "#c2255c", "#5c940d"];

interface Line {
  key: string;
  label: string;
  color: string;
  series: Point[];
  dash?: string;
  width: number;
  step: boolean;
}

const H = 280;
const PAD = { l: 38, r: 10, t: 10, b: 24 };

function valueAt(series: Point[], ts: number): number | null {
  let v: number | null = null;
  for (const [t, val] of series) {
    if (t > ts) break;
    v = val;
  }
  return v;
}

/** SVG chart of sensor temperatures, targets, TRV setpoint, heating and window periods. */
export class HeatingChart extends LitElement {
  static properties = {
    history: { attribute: false },
    room: { attribute: false },
    _width: { state: true },
    _hover: { state: true },
    _hidden: { state: true },
  };

  declare history?: RoomHistory;
  declare room?: RoomInfo;
  declare _width: number;
  declare _hover?: number;
  declare _hidden: Set<string>;
  private _ro?: ResizeObserver;

  constructor() {
    super();
    this._width = 600;
    this._hidden = new Set(["targets"]);
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && Math.abs(w - this._width) > 1) this._width = w;
    });
    this._ro.observe(this);
  }

  disconnectedCallback(): void {
    this._ro?.disconnect();
    super.disconnectedCallback();
  }

  private _lines(): Line[] {
    const h = this.history!;
    const room = this.room!;
    const lines: Line[] = [];
    room.sensors.forEach((s, i) => {
      const color = PALETTE[i % PALETTE.length];
      lines.push({ key: s.entity_id, label: s.name, color, series: h.sensors[s.entity_id] ?? [], width: 2, step: false });
      lines.push({
        key: `targets:${s.entity_id}`,
        label: `${s.name} target`,
        color,
        series: h.targets[s.entity_id] ?? [],
        dash: "5 4",
        width: 1.2,
        step: true,
      });
    });
    lines.push({ key: "trv_setpoint", label: "TRV setpoint", color: "var(--secondary-text-color)", series: h.trv_setpoint, dash: "1 3", width: 1.5, step: true });
    lines.push({ key: "room_target", label: "Room target", color: "var(--primary-text-color)", series: h.room_target, dash: "8 4", width: 1, step: true });
    return lines;
  }

  private _visible(line: Line): boolean {
    if (line.key.startsWith("targets:")) return !this._hidden.has("targets");
    return !this._hidden.has(line.key);
  }

  private _toggle(key: string): void {
    const hidden = new Set(this._hidden);
    if (hidden.has(key)) hidden.delete(key);
    else hidden.add(key);
    this._hidden = hidden;
  }

  protected render() {
    const h = this.history;
    if (!h || !this.room) return html`<div class="empty">Loading history…</div>`;
    const W = Math.max(this._width, 280);
    const allLines = this._lines();
    const lines = allLines.filter((l) => this._visible(l));
    const values = lines.flatMap((l) => l.series.map((p) => p[1])).filter((v): v is number => v != null);
    let yMin = values.length ? Math.floor(Math.min(...values) - 0.5) : 15;
    let yMax = values.length ? Math.ceil(Math.max(...values) + 0.5) : 25;
    if (yMax - yMin < 4) {
      yMin -= 1;
      yMax += 1;
    }
    const span = h.end - h.start;
    const x = (ts: number) => PAD.l + ((Math.max(ts, h.start) - h.start) / span) * (W - PAD.l - PAD.r);
    const y = (v: number) => PAD.t + ((yMax - v) / (yMax - yMin)) * (H - PAD.t - PAD.b);

    const path = (line: Line): string => {
      let d = "";
      let prev: number | null = null;
      for (const [ts, v] of line.series) {
        const xs = x(ts);
        if (v == null) {
          if (prev != null) d += `H${xs.toFixed(1)}`;
          prev = null;
          continue;
        }
        const ys = y(v);
        if (prev == null) d += `M${xs.toFixed(1)},${ys.toFixed(1)}`;
        else d += line.step ? `H${xs.toFixed(1)}V${ys.toFixed(1)}` : `L${xs.toFixed(1)},${ys.toFixed(1)}`;
        prev = ys;
      }
      if (prev != null) d += `H${x(h.end).toFixed(1)}`;
      return d;
    };

    const bands = (series: Point[], cls: string) => {
      const rects = [];
      for (let i = 0; i < series.length; i++) {
        if (series[i][1] !== 1) continue;
        const x0 = x(series[i][0]);
        const x1 = x(series[i + 1]?.[0] ?? h.end);
        rects.push(svg`<rect class=${cls} x=${x0} y=${PAD.t} width=${Math.max(x1 - x0, 1)} height=${H - PAD.t - PAD.b}></rect>`);
      }
      return rects;
    };

    const yStep = yMax - yMin > 10 ? 2 : 1;
    const yTicks: number[] = [];
    for (let v = Math.ceil(yMin); v <= yMax; v += yStep) yTicks.push(v);
    const hours = span / 3600;
    const xStepH = hours <= 24 ? 3 : hours <= 72 ? 12 : 24;
    const xTicks: number[] = [];
    const first = new Date(h.start * 1000);
    first.setMinutes(0, 0, 0);
    if (xStepH === 24) first.setHours(0);
    for (let t = first.getTime() / 1000; t <= h.end; t += 3600) {
      const d = new Date(t * 1000);
      if (t >= h.start && d.getHours() % xStepH === 0) xTicks.push(t);
    }
    const xLabel = (t: number) => {
      const d = new Date(t * 1000);
      return xStepH === 24
        ? d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })
        : d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    };

    const hover = this._hover;
    const hoverRows = hover != null
      ? lines
          .filter((l) => !l.key.startsWith("targets:"))
          .map((l) => ({ l, v: valueAt(l.series, hover) }))
          .filter((r) => r.v != null)
      : [];

    return html`
      <div class="legend">
        ${allLines
          .filter((l) => !l.key.startsWith("targets:"))
          .map(
            (l) => html`<button class="item ${this._hidden.has(l.key) ? "off" : ""}" @click=${() => this._toggle(l.key)}>
              <span class="swatch" style="background:${l.color}"></span>${l.label}
            </button>`,
          )}
        <button class="item ${this._hidden.has("targets") ? "off" : ""}" @click=${() => this._toggle("targets")}>
          <span class="swatch dashed"></span>Effective targets
        </button>
        <span class="item static"><span class="swatch heat"></span>Heating</span>
        <span class="item static"><span class="swatch window"></span>Window open</span>
      </div>
      <div class="wrap">
        <svg
          width=${W}
          height=${H}
          @mousemove=${(e: MouseEvent) => this._move(e, W)}
          @mouseleave=${() => (this._hover = undefined)}
        >
          ${bands(h.heating, "heat")} ${bands(h.window, "window")}
          ${yTicks.map(
            (v) => svg`<line class="grid" x1=${PAD.l} x2=${W - PAD.r} y1=${y(v)} y2=${y(v)}></line>
              <text class="ylabel" x=${PAD.l - 6} y=${y(v) + 4}>${v}°</text>`,
          )}
          ${xTicks.map(
            (t) => svg`<line class="grid" x1=${x(t)} x2=${x(t)} y1=${PAD.t} y2=${H - PAD.b}></line>
              <text class="xlabel" x=${x(t)} y=${H - 6}>${xLabel(t)}</text>`,
          )}
          ${lines.map(
            (l) => svg`<path d=${path(l)} fill="none" stroke=${l.color} stroke-width=${l.width}
              stroke-dasharray=${l.dash ?? "none"} stroke-linejoin="round"></path>`,
          )}
          ${hover != null ? svg`<line class="cursor" x1=${x(hover)} x2=${x(hover)} y1=${PAD.t} y2=${H - PAD.b}></line>` : nothing}
        </svg>
        ${hover != null && hoverRows.length
          ? html`<div class="tooltip" style=${x(hover) > W / 2 ? `right:${W - x(hover) + 8}px` : `left:${x(hover) + 8}px`}>
              <div class="time">${new Date(hover * 1000).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}</div>
              ${hoverRows.map(
                (r) => html`<div><span class="swatch" style="background:${r.l.color}"></span>${r.l.label}: <b>${r.v!.toFixed(1)}°</b></div>`,
              )}
              ${valueAt(h.heating, hover) === 1 ? html`<div class="heat-text">Heating</div>` : nothing}
              ${valueAt(h.window, hover) === 1 ? html`<div class="window-text">Window open</div>` : nothing}
            </div>`
          : nothing}
      </div>
    `;
  }

  private _move(e: MouseEvent, W: number): void {
    const h = this.history;
    if (!h) return;
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    if (px < PAD.l || px > W - PAD.r) {
      this._hover = undefined;
      return;
    }
    this._hover = h.start + ((px - PAD.l) / (W - PAD.l - PAD.r)) * (h.end - h.start);
  }

  static styles = css`
    :host {
      display: block;
    }
    .empty {
      color: var(--secondary-text-color);
      padding: 24px 0;
      text-align: center;
    }
    .wrap {
      position: relative;
    }
    svg {
      display: block;
      overflow: visible;
    }
    .grid {
      stroke: var(--divider-color, #e0e0e0);
      stroke-width: 1;
    }
    .ylabel,
    .xlabel {
      fill: var(--secondary-text-color);
      font-size: 11px;
    }
    .ylabel {
      text-anchor: end;
    }
    .xlabel {
      text-anchor: middle;
    }
    rect.heat {
      fill: var(--state-climate-heat-color, #ff8100);
      opacity: 0.12;
    }
    rect.window {
      fill: var(--info-color, #039be5);
      opacity: 0.18;
    }
    .cursor {
      stroke: var(--secondary-text-color);
      stroke-width: 1;
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 12px;
      margin-bottom: 8px;
      font-size: 0.85em;
    }
    .item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: none;
      background: none;
      padding: 2px 0;
      color: var(--primary-text-color);
      font: inherit;
      cursor: pointer;
    }
    .item.static {
      cursor: default;
      color: var(--secondary-text-color);
    }
    .item.off {
      opacity: 0.4;
      text-decoration: line-through;
    }
    .swatch {
      display: inline-block;
      width: 12px;
      height: 3px;
      border-radius: 2px;
    }
    .swatch.dashed {
      background: repeating-linear-gradient(90deg, var(--primary-text-color) 0 4px, transparent 4px 7px);
    }
    .swatch.heat {
      height: 10px;
      background: color-mix(in srgb, var(--state-climate-heat-color, #ff8100) 30%, transparent);
    }
    .swatch.window {
      height: 10px;
      background: color-mix(in srgb, var(--info-color, #039be5) 35%, transparent);
    }
    .tooltip {
      position: absolute;
      top: 8px;
      pointer-events: none;
      background: var(--card-background-color, #fff);
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 0.8em;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      white-space: nowrap;
      z-index: 1;
    }
    .tooltip .time {
      color: var(--secondary-text-color);
      margin-bottom: 2px;
    }
    .tooltip .swatch {
      margin-right: 4px;
      vertical-align: middle;
    }
    .heat-text {
      color: var(--state-climate-heat-color, #ff8100);
    }
    .window-text {
      color: var(--info-color, #039be5);
    }
  `;
}
