import type { HomeAssistant, RoomHistory, RoomInfo } from "./types";

const DOMAIN = "multisensor_heating";
const ROOMS_TTL_MS = 60_000;
/** Forced fetches within this window share one request (e.g. several cards on a page). */
const ROOMS_DEDUPE_MS = 2_000;
export const RETRY_MS = 10_000;
let roomsPromise: Promise<RoomInfo[]> | undefined;
let roomsFetchedAt = 0;

export function getRooms(hass: HomeAssistant, force = false): Promise<RoomInfo[]> {
  const age = Date.now() - roomsFetchedAt;
  if (!roomsPromise || age > ROOMS_TTL_MS || (force && age > ROOMS_DEDUPE_MS)) {
    roomsFetchedAt = Date.now();
    roomsPromise = hass.callWS<RoomInfo[]>({ type: `${DOMAIN}/rooms` });
    roomsPromise.catch(() => (roomsPromise = undefined));
  }
  return roomsPromise;
}

export function getHistory(hass: HomeAssistant, entryId: string, hours: number): Promise<RoomHistory> {
  return hass.callWS<RoomHistory>({ type: `${DOMAIN}/room_history`, entry_id: entryId, hours });
}

export function num(hass: HomeAssistant, entityId?: string | null, attribute?: string): number | undefined {
  const state = entityId ? hass.states[entityId] : undefined;
  if (!state) return undefined;
  const v = parseFloat(attribute ? state.attributes[attribute] : state.state);
  return Number.isFinite(v) ? v : undefined;
}

export const fmt = (v: number | null | undefined, digits = 1): string =>
  v == null || !Number.isFinite(v) ? "–" : v.toFixed(digits);

export const fmtSigned = (v: number | null | undefined, digits = 1): string =>
  v == null || !Number.isFinite(v) ? "–" : `${v > 0 ? "+" : ""}${v.toFixed(digits)}`;

export const slug = (name: string): string =>
  name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "room";

export interface StatusInfo {
  label: string;
  color: string;
  icon: string;
}

export const STATUS: Record<string, StatusInfo> = {
  heating: { label: "Heating", color: "var(--state-climate-heat-color, #ff8100)", icon: "mdi:fire" },
  idle: { label: "Idle", color: "var(--success-color, #43a047)", icon: "mdi:check-circle-outline" },
  window_open: { label: "Window open", color: "var(--info-color, #039be5)", icon: "mdi:window-open-variant" },
  room_off: { label: "Off", color: "var(--state-inactive-color, #9e9e9e)", icon: "mdi:power" },
  vacation: { label: "Vacation", color: "#8e44ad", icon: "mdi:beach" },
  disabled: { label: "Automation off", color: "var(--state-inactive-color, #9e9e9e)", icon: "mdi:robot-off" },
  trv_unavailable: { label: "TRV unavailable", color: "var(--error-color, #db4437)", icon: "mdi:alert" },
  no_sensors: { label: "No sensors", color: "var(--error-color, #db4437)", icon: "mdi:alert" },
  unknown: { label: "Unknown", color: "var(--state-inactive-color, #9e9e9e)", icon: "mdi:help-circle-outline" },
};

export const SENSOR_STATUS: Record<string, StatusInfo> = {
  cold: { label: "Cold", color: "var(--info-color, #039be5)", icon: "mdi:snowflake" },
  ok: { label: "OK", color: "var(--success-color, #43a047)", icon: "mdi:check" },
  hot: { label: "Hot", color: "var(--error-color, #db4437)", icon: "mdi:fire-alert" },
  unavailable: { label: "N/A", color: "var(--state-inactive-color, #9e9e9e)", icon: "mdi:help" },
};

export function roomReason(hass: HomeAssistant, room: RoomInfo): string {
  const climate = room.entities.climate ? hass.states[room.entities.climate] : undefined;
  return (climate?.attributes.reason as string | undefined) ?? "unknown";
}

export function openWindows(hass: HomeAssistant, room: RoomInfo): string[] {
  return room.windows.filter((w) => hass.states[w]?.state === "on");
}

export function fireEvent(node: HTMLElement, type: string, detail: unknown = {}): void {
  node.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}

export function navigate(path: string): void {
  history.pushState(null, "", path);
  window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
}

export function sinceText(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h} h ${mins % 60} min` : `${Math.floor(h / 24)} d`;
}
