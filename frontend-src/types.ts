export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity | undefined>;
  callService(domain: string, service: string, data?: Record<string, unknown>): Promise<unknown>;
  callWS<T>(msg: Record<string, unknown>): Promise<T>;
}

export interface RoomSensor {
  entity_id: string;
  name: string;
  is_trv: boolean;
  is_reference: boolean;
  offset: string | null;
  min: string | null;
  max: string | null;
  effective_target: string | null;
}

export interface RoomInfo {
  entry_id: string;
  name: string;
  trv_entity: string;
  lock_entity: string | null;
  reference_sensor: string;
  entities: {
    climate: string | null;
    automation: string | null;
    lock: string | null;
    window_blocked: string | null;
    heating: string | null;
    reason: string | null;
    deficit: string | null;
    requested_setpoint: string | null;
    gain: string | null;
    hysteresis: string | null;
    vacation_temp: string | null;
  };
  sensors: RoomSensor[];
  windows: string[];
}

export type Point = [number, number | null];

export interface RoomHistory {
  start: number;
  end: number;
  sensors: Record<string, Point[]>;
  targets: Record<string, Point[]>;
  trv_setpoint: Point[];
  room_target: Point[];
  heating: Point[];
  window: Point[];
}

/** Per-sensor evaluation exposed in the room climate "sensors" attribute. */
export interface SensorStatus {
  temperature: number | null;
  effective_target: number;
  lower: number;
  upper: number;
  status: "cold" | "ok" | "hot" | "unavailable";
  deficit: number | null;
}
