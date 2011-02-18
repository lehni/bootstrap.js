//#ifndef __lang_Function__
//#define __lang_Function__

////////////////////////////////////////////////////////////////////////////////
// Function

Function.inject(new function() {

//#ifdef BROWSER

	function timer(set) {
		return function(delay, bind, args) {
			// It's a bit of a shame we can't use the ES5 bind() here easily:
			var func = this.wrap(bind, args);
			// If delay is not defined, execute right away and return the result
			// of the function. This is used in fireEvent.
			if (delay === undefined)
				return func();
			var timer = set(func, delay);
			func.clear = function() {
				clearTimeout(timer);
				clearInterval(timer);
			};
			return func;
		};
	}

//#endif // BROWSER

	return {
		generics: true,
		preserve: true,

//#ifdef BROWSER

		delay: timer(setTimeout),
		periodic: timer(setInterval),

//#endif // BROWSER

//#ifndef ECMASCRIPT_5

		bind: function(bind) {
			var that = this, slice = Array.prototype.slice,
				args = arguments.length > 1 ? slice.call(arguments, 1) : null;
			return function() {
				return that.apply(bind, args ? arguments.length > 0
					? args.concat(slice.call(arguments)) : args : arguments);
			}
		},

//#endif // !ECMASCRIPT_5

		wrap: function(bind, args) {
			var that = this;
			return function() {
				return that.apply(bind, args || arguments);
			}
		}
	}
});

//#endif // __lang_Function__