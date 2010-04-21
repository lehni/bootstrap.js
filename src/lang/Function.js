#ifndef __lang_Function__
#define __lang_Function__

////////////////////////////////////////////////////////////////////////////////
// Function

Function.inject(new function() {
#ifdef BROWSER
	function timer(that, type, delay, bind, args) {
		// If delay is not defined, execute right away and return the result
		// of the function. This is used in fireEvent.
		if (delay === undefined)
			// IE seems to not support passing undefined for args in apply,
			// so make sure it's always defined:
			return that.apply(bind, args ? args : []);
		var fn = that.bind(bind, args);
		var timer = window['set' + type](fn, delay);
		fn.clear = function() {
			clearTimeout(timer);
			clearInterval(timer);
		};
		return fn;
	}
#endif // BROWSER

	return {
		BEANS_TRUE
		generics: true,

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
#endif // BROWSER

		// TODO: This is standard now, but defined differently!
		// Rename, or change to standard implementation
		bind: function(bind, args) {
			var that = this;
			return function() {
				return that.apply(bind, args || arguments);
			}
		},

		attempt: function(bind, args) {
			var that = this;
			return function() {
				try {
					return that.apply(bind, args || arguments);
				} catch (e) {
					return e;
				}
			}
		}
	}
});

#endif // __lang_Function__