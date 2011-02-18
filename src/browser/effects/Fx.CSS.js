//#ifndef __browser_effects_Fx_CSS__
//#define __browser_effects_Fx_CSS__

//#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
//#endif // HIDDEN

//#include "Fx.js"

////////////////////////////////////////////////////////////////////////////////
// Fx.CSS

Fx.CSS = new function() {

	var parsers = new Hash({
//#ifdef __lang_Color__
		color: {
			match: function(value) {
				if (value.match(/^#[0-9a-f]{3,6}$/i)) return value.hexToRgb(true);
				return ((value = value.match(/(\d+),\s*(\d+),\s*(\d+)/))) ? [value[1], value[2], value[3]] : false;
			},

			compute: function(from, to, fx) {
				return from.map(function(value, i) {
					return Math.round(fx.compute(value, to[i]));
				});
			},

			get: function(value) {
				return value.map(Number);
			}
		},

//#endif // __lang_Color__
		number: {
			match: function(value) {
				return parseFloat(value);
			},

			compute: function(from, to, fx) {
				return fx.compute(from, to);
			},

			get: function(value, unit) {
				return (unit) ? value + unit : value;
			}
		}
	});

	return {
		start: function(element, property, values) {
			values = Array.convert(values);
			// If only one value is specified, use the current state as the
			// starting point.
			if (!Base.check(values[1]))
				values = [ element.getStyle(property), values[0] ];
			var parsed = values.map(Fx.CSS.set);
			return { from: parsed[0], to: parsed[1] };
		},

		set: function(value) {
			// Array.create splits strings at white spaces through String#toArray
			return Array.convert(value).map(function(val) {
				val = val + '';
				var res = parsers.find(function(parser, key) {
					var value = parser.match(val);
					if (Base.check(value)) return { value: value, parser: parser };
				}) || {
					value: val,
					parser: {
						compute: function(from, to) {
							return to;
						}
					}
				};
				return res;
			});
		},

		compute: function(from, to, fx) {
			return from.map(function(obj, i) {
				return {
					value: obj.parser.compute(obj.value, to[i].value, fx),
					parser: obj.parser
				};
			});
		},

		get: function(now, unit) {
			return now.reduce(function(prev, cur) {
				var get = cur.parser.get;
				return prev.concat(get ? get(cur.value, unit) : cur.value);
			}, []);
		}
	}
};

//#endif // __browser_effects_Fx_CSS__