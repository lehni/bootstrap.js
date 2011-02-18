//#ifndef __browser_effects_Fx_Transitions__
//#define __browser_effects_Fx_Transitions__

//#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
//#endif // HIDDEN

//#include "Fx.js"

Fx.Transitions = new Base().inject({
	// Override the Fx.Transitions' inject function so that each function that
	// is injected recieved #In, #Out and #InOut as additional methods.
	inject: function(src) {
		// Walk through all passed functions and add the additional functions.
		return this.base(Base.each(src, function(func, name) {
			func.In = func;

			func.Out = function(pos) {
				return 1 - func(1 - pos);
			}

			func.InOut = function(pos) {
				return pos <= 0.5 ? func(2 * pos) / 2 : (2 - func(2 * (1 - pos))) / 2;
			}
		}));
	},

	Linear: function(p) {
		return p;
	}
});

Fx.Transitions.inject({
	Pow: function(p, x) {
		return Math.pow(p, x[0] || 6);
	},

	Expo: function(p) {
		return Math.pow(2, 8 * (p - 1));
	},

	Circ: function(p) {
		return 1 - Math.sin(Math.acos(p));
	},

	Sine: function(p) {
		return 1 - Math.sin((1 - p) * Math.PI / 2);
	},

	Back: function(p, x) {
		x = x[0] || 1.618;
		return Math.pow(p, 2) * ((x + 1) * p - x);
	},

	Bounce: function(p) {
		var value;
		for (var a = 0, b = 1; 1; a += b, b /= 2) {
			if (p >= (7 - 4 * a) / 11) {
				value = - Math.pow((11 - 6 * a - 11 * p) / 4, 2) + b * b;
				break;
			}
		}
		return value;
	},

	Elastic: function(p, x) {
		return Math.pow(2, 10 * --p) * Math.cos(20 * p * Math.PI * (x[0] || 1) / 3);
	}

});

Fx.Transitions.inject(['Quad', 'Cubic', 'Quart', 'Quint'].each(function(name, i) {
	this[name] = function(p) {
		return Math.pow(p, i + 2);
	}
}, {}));

//#endif // __browser_effects_Fx_Transitions__