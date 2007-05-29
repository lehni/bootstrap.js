#ifndef __browser_Fx_Style__
#define __browser_Fx_Style__

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

Fx.Style = Fx.Base.extend({
	$constructor: function(el, prop, opts) {
		this.element = $(el);
		this.property = prop;
		this.$super(opts);
	},

	hide: function() {
		return this.set(0);
	},

	get: function() {
		return this.css.compute(this.from, this.to, this);
	},

	set: function(to) {
		this.css = Fx.CSS.select(this.property, to);
		return this.$super(this.css.parse(to));
	},

	start: function(from, to) {
		if (this.timer && this.options.wait) return this;
		var parsed = Fx.CSS.parse(this.element, this.property, [from, to]);
		this.css = parsed.css;
		return this.$super(parsed.from, parsed.to);
	},

	update: function(val) {
		this.element.setStyle(this.property, this.css.get(val, this.options.unit));
	}
});

Element.inject({
	// var effect = $('#id').effect('height', { duration: 1000, transition: Fx.Transitions.linear });
	// effect.start(10, 100);
	effect: function(prop, opts) {
		return new Fx.Style(this, prop, opts);
	}
});

#endif // __browser_Fx_Style__