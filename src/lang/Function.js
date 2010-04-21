#ifndef __lang_Function__
#define __lang_Function__

////////////////////////////////////////////////////////////////////////////////
// Function

Function.inject(new function() {
#ifdef BROWSER
	function timer(that, set, delay, bind, args) {
		// If delay is not defined, execute right away and return the result
		// of the function. This is used in fireEvent.
		if (delay === undefined)
			// IE seems to not support passing undefined for args in apply,
			// so make sure it's always defined:
			return that.apply(bind, args ? args : []);
		var func = that.bind(bind, args);
		var timer = set(func, delay);
		func.clear = function() {
			clearTimeout(timer);
			clearInterval(timer);
		};
		return func;
	}

	return {
		generics: true,

		delay: function(delay, bind, args) {
			return timer(this, setTimeout, delay, bind, args);
		},

		periodic: function(delay, bind, args) {
			return timer(this, setInterval, delay, bind, args);
		},
#else // !BROWSER
	return {
		generics: true,
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