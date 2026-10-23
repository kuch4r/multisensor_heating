//#region node_modules/@lit/reactive-element/css-tag.js
var e = globalThis, t = e.ShadowRoot && (e.ShadyCSS === void 0 || e.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, n = Symbol(), r = /* @__PURE__ */ new WeakMap(), i = class {
	constructor(e, t, r) {
		if (this._$cssResult$ = !0, r !== n) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, n = this.t;
		if (t && e === void 0) {
			let t = n !== void 0 && n.length === 1;
			t && (e = r.get(n)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), t && r.set(n, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, a = (e) => new i(typeof e == "string" ? e : e + "", void 0, n), o = (e, ...t) => new i(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, n), s = (n, r) => {
	if (t) n.adoptedStyleSheets = r.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let t of r) {
		let r = document.createElement("style"), i = e.litNonce;
		i !== void 0 && r.setAttribute("nonce", i), r.textContent = t.cssText, n.appendChild(r);
	}
}, c = t ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return a(t);
})(e) : e, { is: l, defineProperty: u, getOwnPropertyDescriptor: d, getOwnPropertyNames: ee, getOwnPropertySymbols: f, getPrototypeOf: p } = Object, m = globalThis, h = m.trustedTypes, g = h ? h.emptyScript : "", te = m.reactiveElementPolyfillSupport, _ = (e, t) => e, v = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? g : null;
				break;
			case Object:
			case Array: e = e == null ? e : JSON.stringify(e);
		}
		return e;
	},
	fromAttribute(e, t) {
		let n = e;
		switch (t) {
			case Boolean:
				n = e !== null;
				break;
			case Number:
				n = e === null ? null : Number(e);
				break;
			case Object:
			case Array: try {
				n = JSON.parse(e);
			} catch {
				n = null;
			}
		}
		return n;
	}
}, ne = (e, t) => !l(e, t), re = {
	attribute: !0,
	type: String,
	converter: v,
	reflect: !1,
	useDefault: !1,
	hasChanged: ne
};
Symbol.metadata ??= Symbol("metadata"), m.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = re) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && u(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = d(this.prototype, e) ?? {
			get() {
				return this[t];
			},
			set(e) {
				this[t] = e;
			}
		};
		return {
			get: r,
			set(t) {
				let a = r?.call(this);
				i?.call(this, t), this.requestUpdate(e, a, n);
			},
			configurable: !0,
			enumerable: !0
		};
	}
	static getPropertyOptions(e) {
		return this.elementProperties.get(e) ?? re;
	}
	static _$Ei() {
		if (this.hasOwnProperty(_("elementProperties"))) return;
		let e = p(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(_("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(_("properties"))) {
			let e = this.properties, t = [...ee(e), ...f(e)];
			for (let n of t) this.createProperty(n, e[n]);
		}
		let e = this[Symbol.metadata];
		if (e !== null) {
			let t = litPropertyMetadata.get(e);
			if (t !== void 0) for (let [e, n] of t) this.elementProperties.set(e, n);
		}
		this._$Eh = /* @__PURE__ */ new Map();
		for (let [e, t] of this.elementProperties) {
			let n = this._$Eu(e, t);
			n !== void 0 && this._$Eh.set(n, e);
		}
		this.elementStyles = this.finalizeStyles(this.styles);
	}
	static finalizeStyles(e) {
		let t = [];
		if (Array.isArray(e)) {
			let n = new Set(e.flat(1 / 0).reverse());
			for (let e of n) t.unshift(c(e));
		} else e !== void 0 && t.push(c(e));
		return t;
	}
	static _$Eu(e, t) {
		let n = t.attribute;
		return !1 === n ? void 0 : typeof n == "string" ? n : typeof e == "string" ? e.toLowerCase() : void 0;
	}
	constructor() {
		super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
	}
	_$Ev() {
		this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
	}
	addController(e) {
		(this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
	}
	removeController(e) {
		this._$EO?.delete(e);
	}
	_$E_() {
		let e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
		for (let n of t.keys()) this.hasOwnProperty(n) && (e.set(n, this[n]), delete this[n]);
		e.size > 0 && (this._$Ep = e);
	}
	createRenderRoot() {
		let e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
		return s(e, this.constructor.elementStyles), e;
	}
	connectedCallback() {
		this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
	}
	enableUpdating(e) {}
	disconnectedCallback() {
		this._$EO?.forEach((e) => e.hostDisconnected?.());
	}
	attributeChangedCallback(e, t, n) {
		this._$AK(e, n);
	}
	_$ET(e, t) {
		let n = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, n);
		if (r !== void 0 && !0 === n.reflect) {
			let i = (n.converter?.toAttribute === void 0 ? v : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? v : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? ne)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
			this.C(e, t, n);
		}
		!1 === this.isUpdatePending && (this._$ES = this._$EP());
	}
	C(e, t, { useDefault: n, reflect: r, wrapped: i }, a) {
		n && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), !0 !== i || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || n || (t = void 0), this._$AL.set(e, t)), !0 === r && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
	}
	async _$EP() {
		this.isUpdatePending = !0;
		try {
			await this._$ES;
		} catch (e) {
			Promise.reject(e);
		}
		let e = this.scheduleUpdate();
		return e != null && await e, !this.isUpdatePending;
	}
	scheduleUpdate() {
		return this.performUpdate();
	}
	performUpdate() {
		if (!this.isUpdatePending) return;
		if (!this.hasUpdated) {
			if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
				for (let [e, t] of this._$Ep) this[e] = t;
				this._$Ep = void 0;
			}
			let e = this.constructor.elementProperties;
			if (e.size > 0) for (let [t, n] of e) {
				let { wrapped: e } = n, r = this[t];
				!0 !== e || this._$AL.has(t) || r === void 0 || this.C(t, void 0, n, r);
			}
		}
		let e = !1, t = this._$AL;
		try {
			e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((e) => e.hostUpdate?.()), this.update(t)) : this._$EM();
		} catch (t) {
			throw e = !1, this._$EM(), t;
		}
		e && this._$AE(t);
	}
	willUpdate(e) {}
	_$AE(e) {
		this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
	}
	_$EM() {
		this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
	}
	get updateComplete() {
		return this.getUpdateComplete();
	}
	getUpdateComplete() {
		return this._$ES;
	}
	shouldUpdate(e) {
		return !0;
	}
	update(e) {
		this._$Eq &&= this._$Eq.forEach((e) => this._$ET(e, this[e])), this._$EM();
	}
	updated(e) {}
	firstUpdated(e) {}
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[_("elementProperties")] = /* @__PURE__ */ new Map(), y[_("finalized")] = /* @__PURE__ */ new Map(), te?.({ ReactiveElement: y }), (m.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var b = globalThis, ie = (e) => e, x = b.trustedTypes, ae = x ? x.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, oe = "$lit$", S = `lit$${Math.random().toFixed(9).slice(2)}$`, se = "?" + S, ce = `<${se}>`, C = document, w = () => C.createComment(""), T = (e) => e === null || typeof e != "object" && typeof e != "function", E = Array.isArray, le = (e) => E(e) || typeof e?.[Symbol.iterator] == "function", D = "[ 	\n\f\r]", O = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, ue = /-->/g, de = />/g, k = RegExp(`>|${D}(?:([^\\s"'>=/]+)(${D}*=${D}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), fe = /'/g, pe = /"/g, me = /^(?:script|style|textarea|title)$/i, he = (e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}), A = he(1), j = he(2), M = Symbol.for("lit-noChange"), N = Symbol.for("lit-nothing"), ge = /* @__PURE__ */ new WeakMap(), P = C.createTreeWalker(C, 129);
function _e(e, t) {
	if (!E(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return ae === void 0 ? t : ae.createHTML(t);
}
var ve = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = O;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === O ? c[1] === "!--" ? o = ue : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = k) : (me.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = k) : o = de : o === k ? c[0] === ">" ? (o = i ?? O, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? k : c[3] === "\"" ? pe : fe) : o === pe || o === fe ? o = k : o === ue || o === de ? o = O : (o = k, i = void 0);
		let d = o === k && e[t + 1].startsWith("/>") ? " " : "";
		a += o === O ? n + ce : l >= 0 ? (r.push(s), n.slice(0, l) + oe + n.slice(l) + S + d) : n + S + (l === -2 ? t : d);
	}
	return [_e(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, F = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = ve(t, n);
		if (this.el = e.createElement(l, r), P.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = P.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(oe)) {
					let t = u[o++], n = i.getAttribute(e).split(S), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? xe : r[1] === "?" ? Se : r[1] === "@" ? Ce : L
					}), i.removeAttribute(e);
				} else e.startsWith(S) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (me.test(i.tagName)) {
					let e = i.textContent.split(S), t = e.length - 1;
					if (t > 0) {
						i.textContent = x ? x.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], w()), P.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], w());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === se) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(S, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += S.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = C.createElement("template");
		return n.innerHTML = e, n;
	}
};
function I(e, t, n = e, r) {
	if (t === M) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = T(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = I(e, i._$AS(e, t.values), i, r)), t;
}
var ye = class {
	constructor(e, t) {
		this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
	}
	get parentNode() {
		return this._$AM.parentNode;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	u(e) {
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? C).importNode(t, !0);
		P.currentNode = r;
		let i = P.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new be(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new we(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = P.nextNode(), a++);
		}
		return P.currentNode = C, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, be = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = N, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
	}
	get parentNode() {
		let e = this._$AA.parentNode, t = this._$AM;
		return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
	}
	get startNode() {
		return this._$AA;
	}
	get endNode() {
		return this._$AB;
	}
	_$AI(e, t = this) {
		e = I(this, e, t), T(e) ? e === N || e == null || e === "" ? (this._$AH !== N && this._$AR(), this._$AH = N) : e !== this._$AH && e !== M && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? le(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== N && T(this._$AH) ? this._$AA.nextSibling.data = e : this.T(C.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = F.createElement(_e(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new ye(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = ge.get(e.strings);
		return t === void 0 && ge.set(e.strings, t = new F(e)), t;
	}
	k(t) {
		E(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(w()), this.O(w()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = ie(e).nextSibling;
			ie(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, L = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = N, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = N;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = I(this, e, t, 0), a = !T(e) || e !== this._$AH && e !== M, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = I(this, r[n + o], t, o), s === M && (s = this._$AH[o]), a ||= !T(s) || s !== this._$AH[o], s === N ? e = N : e !== N && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === N ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, xe = class extends L {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === N ? void 0 : e;
	}
}, Se = class extends L {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== N);
	}
}, Ce = class extends L {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = I(this, e, t, 0) ?? N) === M) return;
		let n = this._$AH, r = e === N && n !== N || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== N && (n === N || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, we = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		I(this, e);
	}
}, Te = b.litHtmlPolyfillSupport;
Te?.(F, be), (b.litHtmlVersions ??= []).push("3.3.3");
var Ee = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new be(t.insertBefore(w(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, R = globalThis, z = class extends y {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Ee(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return M;
	}
};
z._$litElement$ = !0, z.finalized = !0, R.litElementHydrateSupport?.({ LitElement: z });
var De = R.litElementPolyfillSupport;
De?.({ LitElement: z }), (R.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region frontend-src/api.ts
var Oe = "multisensor_heating", ke = 6e4, Ae = 2e3, je = 1e4, B, Me = 0;
function V(e, t = !1) {
	let n = Date.now() - Me;
	return (!B || n > ke || t && n > Ae) && (Me = Date.now(), B = e.callWS({ type: `${Oe}/rooms` }), B.catch(() => B = void 0)), B;
}
function Ne(e, t, n) {
	return e.callWS({
		type: `${Oe}/room_history`,
		entry_id: t,
		hours: n
	});
}
function H(e, t, n) {
	let r = t ? e.states[t] : void 0;
	if (!r) return;
	let i = parseFloat(n ? r.attributes[n] : r.state);
	return Number.isFinite(i) ? i : void 0;
}
var U = (e, t = 1) => e == null || !Number.isFinite(e) ? "–" : e.toFixed(t), W = (e, t = 1) => e == null || !Number.isFinite(e) ? "–" : `${e > 0 ? "+" : ""}${e.toFixed(t)}`, Pe = (e) => e.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "room", G = {
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
}, Fe = {
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
}, Ie = [
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
function K(e, t) {
	return t.entities.mode ? e.states[t.entities.mode]?.state : void 0;
}
function q(e, t, n) {
	t.entities.mode && e.callService("select", "select_option", {
		entity_id: t.entities.mode,
		option: n
	});
}
function Le(e, t) {
	return (t.entities.climate ? e.states[t.entities.climate] : void 0)?.attributes.reason ?? "unknown";
}
function Re(e, t) {
	return t.windows.filter((t) => e.states[t]?.state === "on");
}
function J(e, t, n = {}) {
	e.dispatchEvent(new CustomEvent(t, {
		detail: n,
		bubbles: !0,
		composed: !0
	}));
}
function ze(e) {
	history.pushState(null, "", e), window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: !1 } }));
}
function Be(e) {
	let t = Math.round((Date.now() - new Date(e).getTime()) / 6e4);
	if (t < 1) return "just now";
	if (t < 60) return `${t} min`;
	let n = Math.floor(t / 60);
	return n < 24 ? `${n} h ${t % 60} min` : `${Math.floor(n / 24)} d`;
}
//#endregion
//#region frontend-src/editors.ts
var Ve = {
	title: "Title",
	tap_action: "Tap on a room",
	show_vacation_toggle: "Show vacation toggle for all rooms",
	entry_id: "Room",
	show_chart: "Show history chart",
	hours: "Default chart range"
}, He = class extends z {
	static properties = {
		hass: { attribute: !1 },
		_config: { state: !0 },
		_rooms: { state: !0 }
	};
	setConfig(e) {
		this._config = e;
	}
	updated() {
		this.hass && !this._rooms && (this._rooms = [], V(this.hass).then((e) => this._rooms = e).catch(() => void 0));
	}
	render() {
		return !this.hass || !this._config ? N : A`<ha-form
      .hass=${this.hass}
      .data=${this._config}
      .schema=${this.schema()}
      .computeLabel=${(e) => Ve[e.name] ?? e.name}
      @value-changed=${(e) => J(this, "config-changed", { config: e.detail.value })}
    ></ha-form>`;
	}
}, Ue = class extends He {
	schema() {
		return [
			{
				name: "title",
				selector: { text: {} }
			},
			{
				name: "tap_action",
				selector: { select: {
					mode: "dropdown",
					options: [
						{
							value: "more-info",
							label: "Open room thermostat dialog"
						},
						{
							value: "navigate",
							label: "Navigate to room view (strategy dashboard)"
						},
						{
							value: "none",
							label: "Nothing"
						}
					]
				} }
			},
			{
				name: "show_vacation_toggle",
				default: !0,
				selector: { boolean: {} }
			}
		];
	}
}, We = class extends He {
	schema() {
		return [
			{
				name: "entry_id",
				selector: { select: {
					mode: "dropdown",
					options: (this._rooms ?? []).map((e) => ({
						value: e.entry_id,
						label: e.name
					}))
				} }
			},
			{
				name: "show_chart",
				selector: { boolean: {} }
			},
			{
				name: "hours",
				selector: { select: {
					mode: "dropdown",
					options: [
						{
							value: 24,
							label: "24 hours"
						},
						{
							value: 72,
							label: "3 days"
						},
						{
							value: 168,
							label: "7 days"
						}
					]
				} }
			}
		];
	}
}, Y = [
	"#e8590c",
	"#1c7ed6",
	"#2f9e44",
	"#ae3ec9",
	"#f08c00",
	"#0c8599",
	"#c2255c",
	"#5c940d"
], X = 280, Z = {
	l: 38,
	r: 10,
	t: 10,
	b: 24
};
function Q(e, t) {
	let n = null;
	for (let [r, i] of e) {
		if (r > t) break;
		n = i;
	}
	return n;
}
var Ge = class extends z {
	static properties = {
		history: { attribute: !1 },
		room: { attribute: !1 },
		_width: { state: !0 },
		_hover: { state: !0 },
		_hidden: { state: !0 }
	};
	_ro;
	constructor() {
		super(), this._width = 600, this._hidden = /* @__PURE__ */ new Set(["targets"]);
	}
	connectedCallback() {
		super.connectedCallback(), this._ro = new ResizeObserver((e) => {
			let t = e[0]?.contentRect.width;
			t && Math.abs(t - this._width) > 1 && (this._width = t);
		}), this._ro.observe(this);
	}
	disconnectedCallback() {
		this._ro?.disconnect(), super.disconnectedCallback();
	}
	_lines() {
		let e = this.history, t = this.room, n = [];
		return t.sensors.forEach((t, r) => {
			let i = Y[r % Y.length];
			n.push({
				key: t.entity_id,
				label: t.name,
				color: i,
				series: e.sensors[t.entity_id] ?? [],
				width: 2,
				step: !1
			}), n.push({
				key: `targets:${t.entity_id}`,
				label: `${t.name} target`,
				color: i,
				series: e.targets[t.entity_id] ?? [],
				dash: "5 4",
				width: 1.2,
				step: !0
			});
		}), n.push({
			key: "trv_setpoint",
			label: "TRV setpoint",
			color: "var(--secondary-text-color)",
			series: e.trv_setpoint,
			dash: "1 3",
			width: 1.5,
			step: !0
		}), n.push({
			key: "room_target",
			label: "Room target",
			color: "var(--primary-text-color)",
			series: e.room_target,
			dash: "8 4",
			width: 1,
			step: !0
		}), n;
	}
	_visible(e) {
		return e.key.startsWith("targets:") ? !this._hidden.has("targets") : !this._hidden.has(e.key);
	}
	_toggle(e) {
		let t = new Set(this._hidden);
		t.has(e) ? t.delete(e) : t.add(e), this._hidden = t;
	}
	render() {
		let e = this.history;
		if (!e || !this.room) return A`<div class="empty">Loading history…</div>`;
		let t = Math.max(this._width, 280), n = this._lines(), r = n.filter((e) => this._visible(e)), i = r.flatMap((e) => e.series.map((e) => e[1])).filter((e) => e != null), a = i.length ? Math.floor(Math.min(...i) - .5) : 15, o = i.length ? Math.ceil(Math.max(...i) + .5) : 25;
		o - a < 4 && (--a, o += 1);
		let s = e.end - e.start, c = (n) => Z.l + (Math.max(n, e.start) - e.start) / s * (t - Z.l - Z.r), l = (e) => Z.t + (o - e) / (o - a) * (X - Z.t - Z.b), u = (t) => {
			let n = "", r = null;
			for (let [e, i] of t.series) {
				let a = c(e);
				if (i == null) {
					r != null && (n += `H${a.toFixed(1)}`), r = null;
					continue;
				}
				let o = l(i);
				n += r == null ? `M${a.toFixed(1)},${o.toFixed(1)}` : t.step ? `H${a.toFixed(1)}V${o.toFixed(1)}` : `L${a.toFixed(1)},${o.toFixed(1)}`, r = o;
			}
			return r != null && (n += `H${c(e.end).toFixed(1)}`), n;
		}, d = (t, n) => {
			let r = [];
			for (let i = 0; i < t.length; i++) {
				if (t[i][1] !== 1) continue;
				let a = c(t[i][0]), o = c(t[i + 1]?.[0] ?? e.end);
				r.push(j`<rect class=${n} x=${a} y=${Z.t} width=${Math.max(o - a, 1)} height=${X - Z.t - Z.b}></rect>`);
			}
			return r;
		}, ee = o - a > 10 ? 2 : 1, f = [];
		for (let e = Math.ceil(a); e <= o; e += ee) f.push(e);
		let p = s / 3600, m = p <= 24 ? 3 : p <= 72 ? 12 : 24, h = [], g = /* @__PURE__ */ new Date(e.start * 1e3);
		g.setMinutes(0, 0, 0), m === 24 && g.setHours(0);
		for (let t = g.getTime() / 1e3; t <= e.end; t += 3600) {
			let n = /* @__PURE__ */ new Date(t * 1e3);
			t >= e.start && n.getHours() % m === 0 && h.push(t);
		}
		let te = (e) => {
			let t = /* @__PURE__ */ new Date(e * 1e3);
			return m === 24 ? t.toLocaleDateString(void 0, {
				weekday: "short",
				day: "numeric"
			}) : t.toLocaleTimeString(void 0, {
				hour: "2-digit",
				minute: "2-digit"
			});
		}, _ = this._hover, v = _ == null ? [] : r.filter((e) => !e.key.startsWith("targets:")).map((e) => ({
			l: e,
			v: Q(e.series, _)
		})).filter((e) => e.v != null);
		return A`
      <div class="legend">
        ${n.filter((e) => !e.key.startsWith("targets:")).map((e) => A`<button class="item ${this._hidden.has(e.key) ? "off" : ""}" @click=${() => this._toggle(e.key)}>
              <span class="swatch" style="background:${e.color}"></span>${e.label}
            </button>`)}
        <button class="item ${this._hidden.has("targets") ? "off" : ""}" @click=${() => this._toggle("targets")}>
          <span class="swatch dashed"></span>Effective targets
        </button>
        <span class="item static"><span class="swatch heat"></span>Heating</span>
        <span class="item static"><span class="swatch window"></span>Window open</span>
      </div>
      <div class="wrap">
        <svg
          width=${t}
          height=${X}
          @mousemove=${(e) => this._move(e, t)}
          @mouseleave=${() => this._hover = void 0}
        >
          ${d(e.heating, "heat")} ${d(e.window, "window")}
          ${f.map((e) => j`<line class="grid" x1=${Z.l} x2=${t - Z.r} y1=${l(e)} y2=${l(e)}></line>
              <text class="ylabel" x=${Z.l - 6} y=${l(e) + 4}>${e}°</text>`)}
          ${h.map((e) => j`<line class="grid" x1=${c(e)} x2=${c(e)} y1=${Z.t} y2=${X - Z.b}></line>
              <text class="xlabel" x=${c(e)} y=${274}>${te(e)}</text>`)}
          ${r.map((e) => j`<path d=${u(e)} fill="none" stroke=${e.color} stroke-width=${e.width}
              stroke-dasharray=${e.dash ?? "none"} stroke-linejoin="round"></path>`)}
          ${_ == null ? N : j`<line class="cursor" x1=${c(_)} x2=${c(_)} y1=${Z.t} y2=${X - Z.b}></line>`}
        </svg>
        ${_ != null && v.length ? A`<div class="tooltip" style=${c(_) > t / 2 ? `right:${t - c(_) + 8}px` : `left:${c(_) + 8}px`}>
              <div class="time">${(/* @__PURE__ */ new Date(_ * 1e3)).toLocaleString(void 0, {
			weekday: "short",
			hour: "2-digit",
			minute: "2-digit"
		})}</div>
              ${v.map((e) => A`<div><span class="swatch" style="background:${e.l.color}"></span>${e.l.label}: <b>${e.v.toFixed(1)}°</b></div>`)}
              ${Q(e.heating, _) === 1 ? A`<div class="heat-text">Heating</div>` : N}
              ${Q(e.window, _) === 1 ? A`<div class="window-text">Window open</div>` : N}
            </div>` : N}
      </div>
    `;
	}
	_move(e, t) {
		let n = this.history;
		if (!n) return;
		let r = e.currentTarget.getBoundingClientRect(), i = e.clientX - r.left;
		this._hover = i < Z.l || i > t - Z.r ? void 0 : n.start + (i - Z.l) / (t - Z.l - Z.r) * (n.end - n.start);
	}
	static styles = o`
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
}, Ke = class extends z {
	static properties = {
		hass: { attribute: !1 },
		_config: { state: !0 },
		_rooms: { state: !0 },
		_error: { state: !0 }
	};
	_loading = !1;
	static getConfigElement() {
		return document.createElement("multisensor-heating-overview-card-editor");
	}
	static getStubConfig() {
		return { title: "Heating" };
	}
	setConfig(e) {
		this._config = {
			tap_action: "more-info",
			...e
		};
	}
	getCardSize() {
		return 1 + Math.ceil((this._rooms?.length ?? 2) / 2) * 2;
	}
	updated() {
		this.hass && !this._rooms && !this._loading && this._load();
	}
	async _load() {
		this._loading = !0;
		try {
			let e = await V(this.hass, !0), t = this._config.rooms;
			this._rooms = t?.length ? e.filter((e) => t.includes(e.entry_id) || t.includes(e.name)) : e, this._error = void 0;
		} catch (e) {
			this._error = `Multi-Sensor Heating not available: ${e.message ?? e}`, window.setTimeout(() => void this._load(), je);
		} finally {
			this._loading = !1;
		}
	}
	render() {
		if (!this._config || !this.hass) return N;
		let e = this._config.show_vacation_toggle !== !1 && !!this._rooms?.length;
		return A`
      <ha-card>
        ${this._config.title || e ? A`<div class="header">
              <span class="title">${this._config.title ?? ""}</span>
              ${e ? this._vacationToggle() : N}
            </div>` : N}
        <div class="grid">
          ${this._error ? A`<div class="msg">${this._error}</div>` : this._rooms ? this._rooms.length === 0 ? A`<div class="msg">No rooms configured yet. Add one in Settings → Devices & services.</div>` : this._rooms.map((e) => this._tile(e)) : A`<div class="msg">Loading…</div>`}
        </div>
      </ha-card>
    `;
	}
	_vacationRooms() {
		return (this._rooms ?? []).filter((e) => ["heat", "vacation"].includes(K(this.hass, e) ?? ""));
	}
	_vacationToggle() {
		let e = this._vacationRooms(), t = e.filter((e) => K(this.hass, e) === "vacation").length, n = e.length > 0 && t === e.length, r = n ? "Vacation: all rooms" : t ? `Vacation: ${t}/${e.length} rooms` : "Vacation";
		return A`<button
      class="vacation ${n ? "on" : t ? "partial" : ""}"
      title=${n ? "Turn vacation off in all rooms" : "Turn vacation on in all heated rooms"}
      ?disabled=${!e.length}
      @click=${() => this._setVacation(!n)}
    >
      <ha-icon icon="mdi:beach"></ha-icon>${r}
    </button>`;
	}
	_setVacation(e) {
		let t = this._vacationRooms().filter((t) => K(this.hass, t) === (e ? "heat" : "vacation")), n = e ? `Turn on vacation mode in ${t.length} room(s)? TRVs will hold the vacation temperature. Rooms that are Off or Disabled are not changed.` : `Turn off vacation mode in ${t.length} room(s) and resume heating?`;
		t.length && window.confirm(n) && t.forEach((t) => q(this.hass, t, e ? "vacation" : "heat"));
	}
	_modeSelector(e) {
		let t = K(this.hass, e);
		return A`<div class="modes" role="radiogroup" aria-label="Room mode" @click=${(e) => e.stopPropagation()}>
      ${Ie.map((n) => A`<button
          role="radio"
          aria-checked=${t === n.value}
          aria-label=${n.label}
          class="mode ${t === n.value ? "active" : ""}"
          style="--mode-color:${n.color}"
          title="${n.label}: ${n.title}"
          @click=${() => t !== n.value && q(this.hass, e, n.value)}
        >
          <ha-icon .icon=${n.icon}></ha-icon>
        </button>`)}
    </div>`;
	}
	_tile(e) {
		let t = this.hass, n = e.entities.climate, r = G[Le(t, e)] ?? G.unknown, i = H(t, n, "current_temperature"), a = H(t, n, "temperature"), o = H(t, e.trv_entity, "current_temperature"), s = H(t, e.trv_entity, "temperature"), c = Re(t, e), l = e.lock_entity && t.states[e.lock_entity]?.state === "locked", u = i != null && a != null ? i - a : void 0;
		return A`
      <div class="tile" style="--status-color:${r.color}" @click=${() => this._tap(e)}>
        <div class="top">
          <span class="name">${e.name}</span>
          <span class="chip"><ha-icon .icon=${r.icon}></ha-icon>${r.label}</span>
        </div>
        <div class="temps">
          <span class="current">${U(i)}<span class="unit">°C</span></span>
          ${u == null ? N : A`<span class="delta ${u < 0 ? "cold" : "warm"}">${u > 0 ? "+" : ""}${u.toFixed(1)}</span>`}
        </div>
        <div class="target-row" @click=${(e) => e.stopPropagation()}>
          <button class="step" aria-label="Lower target" @click=${() => this._step(n, a, -.5)}>
            <ha-icon icon="mdi:minus"></ha-icon>
          </button>
          <span class="target">Target <b>${U(a)}°</b></span>
          <button class="step" aria-label="Raise target" @click=${() => this._step(n, a, .5)}>
            <ha-icon icon="mdi:plus"></ha-icon>
          </button>
        </div>
        ${this._modeSelector(e)}
        <div class="foot">
          <span title="TRV temperature → TRV setpoint"><ha-icon icon="mdi:radiator"></ha-icon>
            ${U(o)}° → ${U(s)}°</span>
          <span class="icons">
            ${c.length ? A`<ha-icon class="warn" icon="mdi:window-open-variant" title="Window open"></ha-icon>` : N}
            ${l ? A`<ha-icon icon="mdi:lock" title="TRV locked"></ha-icon>` : N}
          </span>
        </div>
      </div>
    `;
	}
	_step(e, t, n) {
		e && t != null && this.hass.callService("climate", "set_temperature", {
			entity_id: e,
			temperature: Math.min(30, Math.max(5, t + n))
		});
	}
	_tap(e) {
		this._config.tap_action === "navigate" ? ze(`/${window.location.pathname.split("/").filter(Boolean)[0] ?? "lovelace"}/${Pe(e.name)}`) : this._config.tap_action !== "none" && e.entities.climate && J(this, "hass-more-info", { entityId: e.entities.climate });
	}
	static styles = o`
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding: 16px 16px 0;
    }
    .title {
      font-size: 24px;
      font-weight: 400;
    }
    .vacation {
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
    .vacation[disabled] {
      opacity: 0.5;
      cursor: default;
    }
    .modes {
      display: flex;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 10px;
      overflow: hidden;
      cursor: default;
    }
    .mode {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-right: 1px solid var(--divider-color, #e0e0e0);
      padding: 4px 0;
      background: none;
      color: var(--secondary-text-color);
      cursor: pointer;
      --mdc-icon-size: 18px;
    }
    .mode:last-child {
      border-right: none;
    }
    .mode.active {
      color: var(--mode-color);
      background: color-mix(in srgb, var(--mode-color) 16%, transparent);
    }
    .vacation.on,
    .vacation.partial {
      border-color: #8e44ad;
      color: #8e44ad;
    }
    .vacation.on {
      background: color-mix(in srgb, #8e44ad 12%, transparent);
    }
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
}, qe = 3e5, Je = {
	heating: "At least one sensor is below its target — the TRV setpoint is raised above the TRV's own reading.",
	idle: "Targets reached (or a sensor is above its upper limit) — the TRV setpoint is kept below the TRV's own reading.",
	window_open: "A window has been open longer than the delay — heating is stopped.",
	room_off: "The room is switched off — heating is stopped.",
	vacation: "Vacation mode — the TRV holds the vacation temperature, sensors are ignored.",
	disabled: "Disabled — the room is not controlled; the TRV is left as it is.",
	trv_unavailable: "The TRV is unavailable — nothing is changed.",
	no_sensors: "No temperature data — the TRV is set to the room target as a fail-safe."
}, Ye = class extends z {
	static properties = {
		hass: { attribute: !1 },
		_config: { state: !0 },
		_room: { state: !0 },
		_history: { state: !0 },
		_hours: { state: !0 },
		_error: { state: !0 },
		_historyError: { state: !0 }
	};
	_loading = !1;
	_timer;
	static getConfigElement() {
		return document.createElement("multisensor-heating-room-card-editor");
	}
	static getStubConfig() {
		return {
			show_chart: !0,
			hours: 24
		};
	}
	setConfig(e) {
		this._config = {
			show_chart: !0,
			hours: 24,
			...e
		}, this._hours = this._config.hours ?? 24, this._room = void 0, this._history = void 0, this._error = void 0;
	}
	getCardSize() {
		return 10;
	}
	connectedCallback() {
		super.connectedCallback(), this._timer = window.setInterval(() => void this._loadHistory(), qe);
	}
	disconnectedCallback() {
		window.clearInterval(this._timer), super.disconnectedCallback();
	}
	updated() {
		this.hass && !this._room && !this._loading && !this._error && this._load();
	}
	async _load() {
		this._loading = !0;
		try {
			let e = await V(this.hass, !0), { entry_id: t, room: n } = this._config;
			this._room = e.find((e) => e.entry_id === t || n && e.name.toLowerCase() === n.toLowerCase()) ?? (!t && !n ? e[0] : void 0), this._room ? (this._error = void 0, await this._loadHistory()) : this._error = "Room not found. Pick a room in the card editor.";
		} catch (e) {
			this._error = `Multi-Sensor Heating not available: ${e.message ?? e}`;
		} finally {
			this._loading = !1;
		}
		this._error && window.setTimeout(() => void this._load(), je);
	}
	async _loadHistory() {
		if (this._room && this._config.show_chart) try {
			this._history = await Ne(this.hass, this._room.entry_id, this._hours), this._historyError = void 0;
		} catch (e) {
			this._history = void 0, this._historyError = e.message ?? String(e);
		}
	}
	_setHours(e) {
		this._hours = e, this._history = void 0, this._loadHistory();
	}
	_call(e, t, n) {
		this.hass.callService(e, t, n);
	}
	_setNumber(e, t) {
		let n = parseFloat(t.target.value);
		e && Number.isFinite(n) && this._call("number", "set_value", {
			entity_id: e,
			value: n
		});
	}
	_toggle(e) {
		e && this._call("switch", "toggle", { entity_id: e });
	}
	_more(e) {
		e && J(this, "hass-more-info", { entityId: e });
	}
	render() {
		if (!this._config || !this.hass) return N;
		if (this._error) return A`<ha-card><div class="pad msg">${this._error}</div></ha-card>`;
		let e = this._room;
		if (!e) return A`<ha-card><div class="pad msg">Loading…</div></ha-card>`;
		let t = this.hass, n = e.entities, r = Le(t, e), i = G[r] ?? G.unknown, a = H(t, n.climate, "temperature"), o = H(t, n.climate, "current_temperature"), s = K(t, e), c = n.lock ? t.states[n.lock]?.state === "on" : !1, l = e.sensors.find((e) => e.is_reference)?.name ?? "reference";
		return A`
      <ha-card style="--status-color:${i.color}">
        <div class="header">
          <div class="title">${e.name}</div>
          <span class="chip"><ha-icon .icon=${i.icon}></ha-icon>${i.label}</span>
        </div>

        <div class="hero">
          <div class="current" @click=${() => this._more(n.climate)}>
            <div class="big">${U(o)}<span class="unit">°C</span></div>
            <div class="sub">${l}</div>
          </div>
          <div class="target">
            <button class="round" aria-label="Lower target"
              @click=${() => a != null && this._call("climate", "set_temperature", {
			entity_id: n.climate,
			temperature: Math.max(5, a - .5)
		})}>
              <ha-icon icon="mdi:minus"></ha-icon>
            </button>
            <div class="target-value"><div class="mid">${U(a)}°</div><div class="sub">target</div></div>
            <button class="round" aria-label="Raise target"
              @click=${() => a != null && this._call("climate", "set_temperature", {
			entity_id: n.climate,
			temperature: Math.min(30, a + .5)
		})}>
              <ha-icon icon="mdi:plus"></ha-icon>
            </button>
          </div>
          <div class="toggles">
            <div class="modes" role="radiogroup" aria-label="Room mode">
              ${Ie.map((n) => A`<button
                  role="radio"
                  aria-checked=${s === n.value}
                  class="mode ${s === n.value ? "active" : ""}"
                  style="--mode-color:${n.color}"
                  title=${n.title}
                  @click=${() => s !== n.value && q(t, e, n.value)}
                >
                  <ha-icon .icon=${n.icon}></ha-icon>${n.label}
                </button>`)}
            </div>
            ${n.lock ? A`<button class="pill ${c ? "on" : ""}" @click=${() => this._toggle(n.lock)}>
                  <ha-icon icon=${c ? "mdi:lock" : "mdi:lock-open-variant"}></ha-icon>TRV lock
                </button>` : N}
          </div>
        </div>

        <div class="reason">${Je[r] ?? ""}</div>
        ${this._facts(e)}
        ${this._sensorTable(e)}
        ${this._tuning(e)}
        ${this._config.show_chart ? this._chart(e) : N}
      </ha-card>
    `;
	}
	_facts(e) {
		let t = this.hass, n = e.entities, r = H(t, e.trv_entity, "current_temperature"), i = H(t, e.trv_entity, "temperature"), a = t.states[e.trv_entity]?.state, o = H(t, n.requested_setpoint), s = H(t, n.deficit);
		return A`
      <div class="facts">
        <div class="fact clickable" @click=${() => this._more(e.trv_entity)}>
          <span class="label">TRV</span><span>${U(r)}° → <b>${U(i)}°</b> <small>(${a ?? "?"})</small></span>
        </div>
        <div class="fact"><span class="label">Requested setpoint</span><span>${U(o)}°</span></div>
        <div class="fact"><span class="label">Heat deficit</span><span>${W(s)}°</span></div>
        ${e.windows.map((e) => {
			let n = t.states[e], r = n?.state === "on";
			return A`<div class="fact clickable ${r ? "open" : ""}" @click=${() => this._more(e)}>
            <span class="label"><ha-icon icon=${r ? "mdi:window-open-variant" : "mdi:window-closed-variant"}></ha-icon>${n?.attributes.friendly_name ?? e}</span>
            <span>${r ? `open ${Be(n.last_changed)}` : "closed"}</span>
          </div>`;
		})}
      </div>
    `;
	}
	_sensorTable(e) {
		let t = this.hass, n = e.entities.climate ? t.states[e.entities.climate]?.attributes.sensors : void 0;
		return A`
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
              ${e.sensors.map((e, t) => this._sensorRow(e, t, n?.[e.entity_id]))}
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
	_sensorRow(e, t, n) {
		let r = this.hass, i = H(r, e.offset), a = H(r, e.min), o = H(r, e.max), s = e.offset ? r.states[e.offset]?.attributes ?? {} : {}, c = s.suggested_offset, l = Fe[n?.status ?? "unavailable"], u = c != null && i != null ? Math.abs(c - i) : 0;
		return A`
      <tr>
        <td class="name">
          <span class="dot" style="background:${Y[t % Y.length]}"></span>
          <span class="clickable" @click=${() => this._more(e.entity_id)}>${e.name}</span>
          ${e.is_reference ? A`<span class="tag ref">reference</span>` : N}
          ${e.is_trv ? A`<span class="tag">TRV</span>` : N}
        </td>
        <td class="numcell"><b>${U(n?.temperature)}°</b></td>
        <td class="numcell" title=${n ? `heat ≤ ${U(n.lower, 2)}°, stop ≥ ${U(n.upper, 2)}°` : ""}>${U(n?.effective_target, 2)}°</td>
        <td><span class="badge" style="--c:${l.color}"><ha-icon .icon=${l.icon}></ha-icon>${l.label}</span></td>
        <td>${this._input(e.offset, i, .1)}</td>
        <td>${this._input(e.min, a, .5)}</td>
        <td>${this._input(e.max, o, .5)}</td>
        <td><span class="suggest">
          ${e.is_reference ? A`<span class="muted">—</span>` : c == null ? A`<span class="muted" title="Needs about 1 h of data">collecting…</span>` : A`<span>${W(c)}°</span>
                  ${u >= .1 ? A`<button class="apply" @click=${() => this._call("number", "set_value", {
			entity_id: e.offset,
			value: c
		})}>Apply</button>` : A`<ha-icon class="ok" icon="mdi:check" title="Offset matches suggestion"></ha-icon>`}`}
        </span></td>
        <td class="numcell muted">
          ${s.min_delta_24h == null ? "–" : A`${W(s.min_delta_24h)} … ${W(s.max_delta_24h)}`}
        </td>
      </tr>
    `;
	}
	_input(e, t, n) {
		return A`<input
      type="number"
      step=${n}
      .value=${t == null ? "" : String(t)}
      ?disabled=${!e}
      @change=${(t) => this._setNumber(e, t)}
    />`;
	}
	_tuning(e) {
		let t = e.entities, n = (e, t, n, r) => A`
      <label class="tune" title=${r}>
        <span>${e}</span>${this._input(t, H(this.hass, t), n)}
        <small>${r}</small>
      </label>
    `;
		return A`
      <details class="section">
        <summary class="section-title">Tuning</summary>
        <div class="tuning">
          ${n("Gain", t.gain, .1, "TRV setpoint = TRV temp + gain × deficit. Higher = heats harder.")}
          ${n("Hysteresis °C", t.hysteresis, .1, "Width of the dead band around each target.")}
          ${n("Vacation °C", t.vacation_temp, .5, "Fixed TRV temperature in vacation mode.")}
        </div>
      </details>
    `;
	}
	_chart(e) {
		return A`
      <div class="section">
        <div class="section-title row">
          <span>History</span>
          <span class="seg">
            ${[
			24,
			72,
			168
		].map((e) => A`<button class=${this._hours === e ? "active" : ""} @click=${() => this._setHours(e)}>
                ${e === 168 ? "7 d" : e === 72 ? "3 d" : "24 h"}
              </button>`)}
          </span>
        </div>
        ${this._historyError ? A`<div class="msg">Could not load history: ${this._historyError}</div>` : A`<multisensor-heating-chart .history=${this._history} .room=${e}></multisensor-heating-chart>`}
      </div>
    `;
	}
	static styles = o`
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
}, Xe = class extends HTMLElement {
	static async generate(e, t) {
		let n = await V(t, !0);
		return {
			title: e.title ?? "Heating",
			views: [{
				title: "Overview",
				path: "overview",
				icon: "mdi:radiator",
				type: "panel",
				cards: [{
					type: "custom:multisensor-heating-overview-card",
					title: e.title ?? "Heating",
					tap_action: "navigate"
				}]
			}, ...n.map((e) => ({
				title: e.name,
				path: Pe(e.name),
				subview: !0,
				back_path: "overview",
				type: "panel",
				cards: [{
					type: "custom:multisensor-heating-room-card",
					entry_id: e.entry_id
				}]
			}))]
		};
	}
}, $ = (e, t) => {
	customElements.get(e) || customElements.define(e, t);
};
$("multisensor-heating-chart", Ge), $("multisensor-heating-overview-card", Ke), $("multisensor-heating-room-card", Ye), $("multisensor-heating-overview-card-editor", Ue), $("multisensor-heating-room-card-editor", We), $("ll-strategy-dashboard-multisensor-heating", Xe);
var Ze = window;
Ze.customCards = Ze.customCards ?? [], Ze.customCards.push({
	type: "multisensor-heating-overview-card",
	name: "Multi-Sensor Heating: Overview",
	description: "Status tile for every room controlled by Multi-Sensor Heating.",
	preview: !1
}, {
	type: "multisensor-heating-room-card",
	name: "Multi-Sensor Heating: Room",
	description: "Room status, sensor offsets/ranges with suggestions, and history chart.",
	preview: !1
}), console.info("%c MULTISENSOR-HEATING %c loaded ", "background:#e8590c;color:#fff", "");
//#endregion
