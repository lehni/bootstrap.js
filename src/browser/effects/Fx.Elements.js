//#ifndef __browser_effects_Fx_Elements__
//#define __browser_effects_Fx_Elements__

//#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 */
//#endif // HIDDEN

//#include "Fx.Styles.js"

Fx.Elements = Fx.extend({
	initialize: function(elements, options) {
		this.base(null, options);
		this.elements = DomElement.getAll(elements);
	},

	start: function(obj) {
		if (this.timer && this.options.wait) return this;
		this.effects = {};

		function start(that, key, val) {
			var fx = that.effects[key] = new Fx.Styles(that.elements[key], that.options);
			// Tell Fx we're in slave mode
			fx.slave = true;
			fx.start(val);
		}

		Base.each(obj, function(val, key) {
			if (key == '*') {
				// Wildcard for effects to be applied to all elements
				this.elements.each(function(el, key) {
					start(this, key, val);
				}, this);
			} else if (isNaN(parseInt(key))) {
				// A selector, for elements to be added, if they are not there
				// already.
				var els = DomElement.getAll(key);
				this.elements.append(els);
				els.each(function(el) {
					start(this, this.elements.indexOf(el), val);
				}, this);
			} else {
				// A normal array index in the passed elements array
				start(this, key, val);
			}
		}, this);
		return this.base();
	},

	set: function(to) {
		// do nothing, since update() handles slaves
	},

	update: function(to) {
		Base.each(this.effects, function(fx) {
			fx.step();
		});
	}
});

//#endif // __browser_effects_Fx_Elements__