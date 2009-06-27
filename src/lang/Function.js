#ifndef __lang_Function__
#define __lang_Function__

////////////////////////////////////////////////////////////////////////////////
// Function

Function.inject(new function() {
#ifdef BROWSER
#ifdef BROWSER_LEGACY
	Function.timers = {};
	var timerId = 0;

#endif // BROWSER_LEGACY
	function timer(that, type, delay, bind, args) {
		// If delay is not defined, execute right away and return the result
		// of the function. This is used in fireEvent.
		if (delay === undefined)
			// IE seems to not support passing undefined for args in apply,
			// so make sure it's always defined:
			return that.apply(bind, args ? args : []);
		var fn = that.bind(bind, args);
#ifdef BROWSER_LEGACY
		var id = timerId++;
		Function.timers[id] = fn;
		var f = 'Function.timers[' + id + ']', call = f + '();';
		// directly erase non-periodic timers
		if (type[0] == 'T') call += ' delete ' + f;
		var timer = window['set' + type](call, delay);
#else // !BROWSER_LEGACY
		var timer = window['set' + type](fn, delay);
#endif // !BROWSER_LEGACY
		fn.clear = function() {
			clearTimeout(timer);
			clearInterval(timer);
#ifdef BROWSER_LEGACY
			delete Function.timers[id];
#endif // BROWSER_LEGACY
		};
		return fn;
	}
#endif // BROWSER

	return {
		_BEANS
		_generics: true,

		/**
		 * Returns the function's name, if not unnamed.
		 */
		getName: function() {
			var match = this.toString().match(/^\s*function\s*(\w*)/);
			return match && match[1];
		},

		/**
		 * Returns the function's parameter names as an array
		 */
		getParameters: function() {
			var str = this.toString().match(/^\s*function[^\(]*\(([^\)]*)/)[1];
			return str ? str.split(/\s*,\s*/) : [];
		},

		/**
		 * Returns the function's body as a string, excluding the surrounding { }
		 */
		getBody: function() {
			return this.toString().match(/^\s*function[^\{]*\{([\u0000-\uffff]*)\}\s*$/)[1];
		},

#ifdef BROWSER
		delay: function(delay, bind, args) {
			return timer(this, 'Timeout', delay, bind, args);
		},

		periodic: function(delay, bind, args) {
			return timer(this, 'Interval', delay, bind, args);
		},
#endif // !BROWSER

		bind: function(bind, args) {
			var that = this;
			return function() {
				return that.apply(bind, args || []);
			}
		},

		attempt: function(bind, args) {
			var that = this;
			return function() {
				try {
					return that.apply(bind, args || []);
				} catch (e) {
					return e;
				}
			}
		}
	}
});
// dontEnum these fields, as we iterate through Function.prototype in
// Function.prototype.inject

#ifdef BROWSER_LEGACY

////////////////////////////////////////////////////////////////////////////////
// Function Legacy

// Function.call / apply does not work properly on IE 5 PC / Mac

if (!Function.prototype.apply) {
	var cache = {};

	Function.inject({
		// = Ecma 1.5 apply/call at native speed, with variable argument count,
		// through caching of caller functions
		apply: function(obj, args, start) {
			if (!start) start = 0;
			// Generate lookup slot name as integer for faster execution.
			// make room for a maximum of 64 arguments.
			// 'start' is the index in args, 0 for 'apply' and 1 for 'call'.
			// This allows passing an unmodified arguments list as array.
			var count = args ? args.length : 0, index = start * 64 + count;
			// Use cached caller functions for the exact amount of parameters
			// like this, we prevent creation of argument lists each time. 
			// Only the first call is slower, as the caller function is created.
			// Everything that follows wit the same amount of parameters should
			// execute at rather decent speed.
			var fn = cache[index];
			if (!fn) {
				fn = [];
				for (var i = start; i < count; ++i)
					fn[i - start] = 'args[' + i + ']';
				fn = cache[index] = new Function('obj, args',
					'return obj.__f(' + fn + ');');
			}
			if (obj) {
				obj.__f = this;
				try { return fn(obj, args); }
				// Delete on window object does not work on IE 5 PC
				finally { obj.__f = undefined; }
			} else {
				// This should be executed in window to be compliant, but
				// for some reasion, on MacIE execution there is much slower
				// than on an empty object. so do not rely on this to point
				// to the global scope when not set otherwise
				return fn({ __f: this }, args);
			}
		},

		call: function(obj) {
			return this.apply(obj, arguments, 1);
		}
	});
}

#endif // BROWSER_LEGACY

#endif // __lang_Function__