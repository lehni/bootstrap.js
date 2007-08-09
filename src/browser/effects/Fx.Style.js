#ifndef __browser_effects_Fx_Style__
#define __browser_effects_Fx_Style__

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

Fx.Style = Fx.extend({
	initialize: function(element, property, options) {
		this.base(element, options);
		this.property = property;
	},

	hide: function() {
		return this.set(0);
	},

	get: function() {
		return Fx.CSS.compute(this.from, this.to, this);
	},

	set: function(to) {
		return this.base(Fx.CSS.set(to));
	},

	start: function(from, to) {
		if (this.timer && this.options.wait) return this;
		var parsed = Fx.CSS.start(this.element, this.property, [from, to]);
		return this.base(parsed.from, parsed.to);
	},

	update: function(val) {
		this.element.setStyle(this.property, Fx.CSS.get(val, this.options.unit));
	}
});

HtmlElement.inject({
	effect: function(prop, opts) {
		return new Fx.Style(this, prop, opts);
	}
});

#endif // __browser_effects_Fx_Style__