#ifndef __browser_Fx_CSS__
#define __browser_Fx_CSS__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif
#include "Fx.js"

////////////////////////////////////////////////////////////////////////////////
// Fx.CSS

Fx.CSS = (function() {
	var single = {
		parse: function(value) {
			return value.toFloat();
		},

		compute: function(from, to, fx) {
			return fx.compute(from, to);
		},

		get: function(value, unit) {
			return value + unit;
		}
	};

	var multi = {
		parse: function(value) {
			return value.push ? value : value.split(' ').map(function(val) {
				return val.toFloat();
			});
		},

		compute: function(from, to, fx) {
			return from.each(function(val, i) {
				this[i] = fx.compute(val, to[i]);
			}, []);
		},

		get: function(value, unit) {
			return value.join(unit + ' ') + unit;
		}
	};

	var color = {
		parse: function(value) {
			return value.push ? value : value.hexToRgb(true);
		},

		compute: function(from, to, fx) {
			return from.each(function(val, i) {
				this[i] = Math.round(fx.compute(val, to[i]));
			}, []);
		},

		get: function(value) {
			return 'rgb(' + value.join(',') + ')';
		}
	};

	return {
		select: function(property, to) {
			if (/color/i.test(property)) return color;
			if (/ /.test(to)) return multi;
			return single;
		},

		parse: function(el, property, fromTo) {
			if (!fromTo.push) fromTo = [fromTo];
			var from = fromTo[0], to = fromTo[1];
			if (!to && to != 0) {
				to = from;
				from = el.getStyle(property);
			}
			var css = this.select(property, to);
			return { from: css.parse(from), to: css.parse(to), css: css };
		}
	}
})();

#endif // __browser_Fx_CSS__