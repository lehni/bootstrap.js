#ifndef __browser_Fx_Styles__
#define __browser_Fx_Styles__

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
	$constructor: function(el, options) {
		this.element = $(el);
		this.$super(options);
	},

	get: function() {
		var self = this;
		return this.from.each(function(val, i) {
			this[i] = self.css[i].compute(self.from[i], self.to[i], self);
		}, {});
	},

	set: function(to) {
		var parsed = {};
		this.css = {};
		to.each(function(val, i) {
			this.css[i] = Fx.CSS.select(i, val);
			parsed[i] = this.css[i].parse(val);
		}, this);
		return this.$super(parsed);
	},

	start: function(obj) {
		if (this.timer && this.options.wait) return this;
		this.now = {};
		this.css = {};
		var from = {}, to = {};
		obj.each(function(val, i) {
			var parsed = Fx.CSS.parse(this.element, i, val);
			from[i] = parsed.from;
			to[i] = parsed.to;
			this.css[i] = parsed.css;
		}, this);
		return this.$super(from, to);
	},

	update: function(val) {
		val.each(function(val, i) {
			this.element.setStyle(i, this.css[i].get(val, this.options.unit));
		}, this);
	}

});

Element.inject({
	effects: function(opts) {
		return new Fx.Styles(this, opts);
	}
});

#endif // __browser_Fx_Styles__