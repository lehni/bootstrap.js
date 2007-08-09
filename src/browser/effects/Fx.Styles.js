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

#include "Fx.CSS.js"

////////////////////////////////////////////////////////////////////////////////
// Fx.Style

Fx.Styles = Fx.extend({
	get: function() {
		var that = this;
		return Base.each(this.from, function(from, key) {
			this[key] = Fx.CSS.compute(from, that.to[key], that);
		}, {});
	},

	set: function(to) {
		return this.base(Base.each(to, function(val, key) {
			this[key] = Fx.CSS.set(val);
		}, {}));
	},

	start: function(obj) {
		if (this.timer && this.options.wait) return this;
		var from = {}, to = {};
		Base.each(obj, function(val, key) {
			var parsed = Fx.CSS.start(this.element, key, val);
			from[key] = parsed.from;
			to[key] = parsed.to;
		}, this);
		return this.base(from, to);
	},

	update: function(val) {
		Base.each(val, function(val, key) {
			this.element.setStyle(key, Fx.CSS.get(val, this.options.unit));
		}, this);
	}

});

HtmlElement.inject({
	effects: function(opts) {
		return new Fx.Styles(this, opts);
	}
});

#endif // __browser_effects_Fx_Styles__