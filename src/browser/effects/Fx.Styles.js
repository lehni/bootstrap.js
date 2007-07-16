#ifndef __browser_effects_Fx_Styles__
#define __browser_effects_Fx_Styles__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif

#include "Fx.js"
#include "Fx.CSS.js"

////////////////////////////////////////////////////////////////////////////////
// Fx.Style

Fx.Styles = Fx.Base.extend({
	initialize: function(el, options) {
		this.element = HtmlElement.get(el);
		this.base(options);
	},

	get: function() {
		var that = this;
		return EACH(this.from, function(val, i) {
			this[i] = that.css[i].compute(that.from[i], that.to[i], that);
		}, {});
	},

	set: function(to) {
		var parsed = {};
		this.css = {};
		EACH(to, function(val, i) {
			this.css[i] = Fx.CSS.select(i, val);
			parsed[i] = this.css[i].parse(val);
		}, this);
		return this.base(parsed);
	},

	start: function(obj) {
		if (this.timer && this.options.wait) return this;
		this.now = {};
		this.css = {};
		var from = {}, to = {};
		EACH(obj, function(val, i) {
			var parsed = Fx.CSS.parse(this.element, i, val);
			from[i] = parsed.from;
			to[i] = parsed.to;
			this.css[i] = parsed.css;
		}, this);
		return this.base(from, to);
	},

	update: function(val) {
		EACH(val, function(val, i) {
			this.element.setStyle(i, this.css[i].get(val, this.options.unit));
		}, this);
	}

});

HtmlElement.inject({
	effects: function(opts) {
		return new Fx.Styles(this, opts);
	}
});

#endif // __browser_effects_Fx_Styles__