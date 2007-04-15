#ifndef __lang_Function__
#define __lang_Function__

////////////////////////////////////////////////////////////////////////////////
// Function

#ifdef RHINO
if (!Function.prototype.$constructor) {
	// Override the function object with an implementation of a more efficient
	// Consctructor that creates properly generated functions instead of
	// interpretated ones. These are faster.
	// This does not seem to break anything, as afterward
	// Object.toString instanceof Function still returns true.
	Function = Function.extend({
		$constructor: function() {
			var params = $A(arguments), body = params.pop();
			return Packages.org.mozilla.javascript.Context.getCurrentContext().compileFunction(
				{}, "function (" + params + ") {" + body + "}", "Function", 0, null);
		}
	});
}
#endif // RHINO

Function.inject(function() {

#ifdef BROWSER
#ifdef BROWSER_LEGACY
	Function.timers = {};
	var timerId = 0;

#endif // BROWSER_LEGACY
	function timer(that, type, args, ms) {
		var fn = that.bind.apply(that, $A(args, 1));
#ifdef BROWSER_LEGACY
		var id = timerId++;
		Function.timers[id] = fn;
		var f = "Function.timers[" + id + "]", call = f + "();";
		// directly erase non-periodic timers
		if (type[0] == 'T') call += " delete " + f;
		var timer = window['set' + type](call, ms);
#else // !BROWSER_LEGACY
		var timer = window['set' + type](fn, ms);
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
		/**
		 * Returns the function's parameter names as an array
		 */
		parameters: function() {
			return this.toString().match(/^\s*function[^\(]*\(([^\)]*)/)[1].split(/\s*,\s*/);
		},

		/**
		 * Returns the function's body as a string, excluding the surrounding { }
		 */
		body: function() {
			return this.toString().match(/^\s*function[^\{]*\{([\s\S]*)\}\s*$/)[1];
		},

#ifdef BROWSER
		delay: function(ms) {
			return timer(this, "Timeout", arguments, ms);
		},

		periodic: function(ms) {
			return timer(this, "Interval", arguments, ms);
		},
#endif // !BROWSER

		bind: function(obj) {
			var that = this, args = $A(arguments, 1);
			return function() {
				return that.apply(obj, args.concat($A(arguments)));
			}
		},

		attempt: function(obj) {
			var that = this, args = $A(arguments, 1);
			return function() {
				try { return that.apply(obj, args.concat($A(arguments))); }
				catch(e) { return e; }
			}
		}
	}
}, true);
// dontEnum these properties, as we iterate through Function.prototype in
// Function.prototype.inject

#ifdef BROWSER_LEGACY

////////////////////////////////////////////////////////////////////////////////
// Function Legacy

// Function.call / apply does not work properly on IE 5 PC / Mac

if (!Function.prototype.apply) {
	// never enum __f, the helper property introduced bellow
	Object.prototype.dontEnum(true, "__f");
	var cache = {};

	Function.inject({
		// = Ecma 1.5 apply/call at native speed, with variable argument count,
		// through caching of caller functions
		apply: function(obj, args, start) {
			if (!start) start = 0;
			// generate lookup slot name as integer for faster execution.
			// make room for a maximum of 64 arguments (start can be 0 or 1)
			var count = args ? args.length : 0, index = start * 64 + count;
			// use cached caller functions for the exact amount of parameters
			// like this, we prevent creation of argument lists each time. 
			// only tehe first call is slower, everything that follows wit the
			// same amount of parameters should execute at almost native speed.
			var fn = cache[index];
			if (!fn) {
				fn = [];
				for (var i = start; i < count; i++)
					fn[i - start] = 'args[' + i + ']';
				fn = cache[index] = new Function('obj, args',
					'return obj.__f(' + fn + ');');
			}
			if (obj) {
				obj.__f = this;
				try { return fn(obj, args); }
				// delete on window object does not work on IE 5 PC
				finally { obj.__f = undefined; }
			} else {
				// this should be executed in window to be compliant, but
				// for some reasion, on MacIE execution there is much slower
				// than on an empty object. so do not rely on this to point
				// to the global scope when not set otherwise
				return fn({ __f: this }, args);
			}
		},

		call: function(obj) {
			return this.apply(obj, arguments, 1);
		}
	}, true);
}

#endif // BROWSER_LEGACY

#endif // __lang_Function__