//#region frontend-src/api.ts
var e = "multisensor_heating", t = 1e4, n, r = 0;
function i(t, i = !1) {
	let a = Date.now() - r;
	return (!n || a > 6e4 || i && a > 2e3) && (r = Date.now(), n = t.callWS({ type: `${e}/rooms` }), n.catch(() => n = void 0)), n;
}
function a(t, n, r) {
	return t.callWS({
		type: `${e}/room_history`,
		entry_id: n,
		hours: r
	});
}
function o(e, t, n) {
	let r = t ? e.states[t] : void 0;
	if (!r) return;
	let i = parseFloat(n ? r.attributes[n] : r.state);
	return Number.isFinite(i) ? i : void 0;
}
var s = (e, t = 1) => e == null || !Number.isFinite(e) ? "–" : e.toFixed(t), c = (e, t = 1) => e == null || !Number.isFinite(e) ? "–" : `${e > 0 ? "+" : ""}${e.toFixed(t)}`, l = (e) => e.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "room", u = {
	heating: {
		label: "Heating",
		color: "var(--state-climate-heat-color, #ff8100)",
		icon: "mdi:fire"
	},
	idle: {
		label: "Idle",
		color: "var(--success-color, #43a047)",
		icon: "mdi:check-circle-outline"
	},
	window_open: {
		label: "Window open",
		color: "var(--info-color, #039be5)",
		icon: "mdi:window-open-variant"
	},
	room_off: {
		label: "Off",
		color: "var(--state-inactive-color, #9e9e9e)",
		icon: "mdi:power"
	},
	vacation: {
		label: "Vacation",
		color: "#8e44ad",
		icon: "mdi:beach"
	},
	disabled: {
		label: "Disabled",
		color: "var(--warning-color, #ffa600)",
		icon: "mdi:robot-off"
	},
	trv_unavailable: {
		label: "TRV unavailable",
		color: "var(--error-color, #db4437)",
		icon: "mdi:alert"
	},
	no_sensors: {
		label: "No sensors",
		color: "var(--error-color, #db4437)",
		icon: "mdi:alert"
	},
	unknown: {
		label: "Unknown",
		color: "var(--state-inactive-color, #9e9e9e)",
		icon: "mdi:help-circle-outline"
	}
}, d = {
	cold: {
		label: "Cold",
		color: "var(--info-color, #039be5)",
		icon: "mdi:snowflake"
	},
	ok: {
		label: "OK",
		color: "var(--success-color, #43a047)",
		icon: "mdi:check"
	},
	hot: {
		label: "Hot",
		color: "var(--error-color, #db4437)",
		icon: "mdi:fire-alert"
	},
	unavailable: {
		label: "N/A",
		color: "var(--state-inactive-color, #9e9e9e)",
		icon: "mdi:help"
	}
}, f = [
	{
		value: "heat",
		label: "Heat",
		icon: "mdi:fire",
		color: "var(--state-climate-heat-color, #ff8100)",
		title: "Controlled by Multi-Sensor Heating (TRV in permanent hold)"
	},
	{
		value: "vacation",
		label: "Vacation",
		icon: "mdi:beach",
		color: "#8e44ad",
		title: "TRV holds the vacation temperature, sensors ignored"
	},
	{
		value: "off",
		label: "Off",
		icon: "mdi:power",
		color: "var(--state-inactive-color, #9e9e9e)",
		title: "No heating (TRV held at the minimum setpoint), still controlled"
	},
	{
		value: "disabled",
		label: "Disabled",
		icon: "mdi:robot-off",
		color: "var(--warning-color, #ffa600)",
		title: "Not controlled: the TRV is left as it is"
	}
];
function p(e, t) {
	return t.entities.mode ? e.states[t.entities.mode]?.state : void 0;
}
function m(e, t, n) {
	t.entities.mode && e.callService("select", "select_option", {
		entity_id: t.entities.mode,
		option: n
	});
}
function h(e, t) {
	return (t.entities.climate ? e.states[t.entities.climate] : void 0)?.attributes.reason ?? "unknown";
}
function g(e, t) {
	return t.windows.filter((t) => e.states[t]?.state === "on");
}
function _(e, t, n = {}) {
	e.dispatchEvent(new CustomEvent(t, {
		detail: n,
		bubbles: !0,
		composed: !0
	}));
}
function v(e) {
	history.pushState(null, "", e), window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: !1 } }));
}
function y(e) {
	let t = Math.round((Date.now() - new Date(e).getTime()) / 6e4);
	if (t < 1) return "just now";
	if (t < 60) return `${t} min`;
	let n = Math.floor(t / 60);
	return n < 24 ? `${n} h ${t % 60} min` : `${Math.floor(n / 24)} d`;
}
//#endregion
export { l as _, _ as a, a as c, o as d, g as f, y as g, m as h, u as i, i as l, h as m, t as n, s as o, p, d as r, c as s, f as t, v as u };
