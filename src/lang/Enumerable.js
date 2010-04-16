#ifndef __lang_Enumerable__
#define __lang_Enumerable__

////////////////////////////////////////////////////////////////////////////////
// Enumerable

/**
 * The Enumerable interface. To add enumerable functionality to any prototype,
 * just use Constructor.inject(Enumerable);
 * This adds the function .each() that can handle both arrays (detected through
 * .length) and dictionaries (if it's not an array, enumerating with for-in).
 */
Enumerable = new function() {
	/**
	 * Converts the passed function to an iterate-function.
	 * This is part of an optimization that is based on the observation that
	 * calling the iterator through bind.__iterate is faster than using iter.apply()
	 * each time.
	 * So iterate wraps the passed function in a closure that sets the __iterate
	 * function (defined by name) on the bind object and then calls the original
	 * function, restoring the original state after it returns.
	 * This is used in many places in Enumerable, each place defining its own 
	 * name for the iterate function, so there are no clashes if calls are nested.
	 */
	Base.iterate = function(fn) {
		return function(iter, bind) {
			// Convert the argument to an iterator function. If none is specified,
			// the identity function is returned. 
			// This supports regular expressions, normal functions, which are
			// returned unmodified, and values to compare to.
			// Wherever this private function is used in the Enumerable functions
			// bellow, a RegExp object, a Function or null may be passed.
			var func = !iter
				? function(val) { return val }
				: typeof iter != 'function'
					? function(val) { return val == iter }
					: iter;
			/*
			// For RegExp support, used this:
			else switch (Base.type(iter)) {
				case 'function': break;
				case 'regexp': func = function(val) { return iter.test(val) }; break;
				default: func = function(val) { return val == iter };
			}
			*/
			if (!bind) bind = this;
			// Interesting benchmark observation: The loops seem execute 
			// faster when called on the object (this), so outsource to
			// the above functions each_Array / each_Object here.
			// pass this twice, so it can be recieved as 'that' in the iterating
			// functions, to be passed to the iterator (and being able to use 
			// 'this' in .each differently)
			return fn.call(this, func, bind, this);
		};
	};

	/**
	 * A special constant, to be thrown by closures passed to each()
	 *
	 * $continue / Base.next is not implemented, as the same functionality can achieved
	 * by using return in the closure. In prototype, the implementation of $continue
	 * also leads to a huge speed decrease, as the closure is wrapped in another
	 * closure that does nothing else than handling $continue.
	 */
	Base.stop = {};

	var each_Array = Array.prototype.forEach || function(iter, bind) {
		for (var i = 0, l = this.length; i < l; ++i)
			iter.call(bind, this[i], i, this);
	};

	var each_Object = function(iter, bind) {
#ifdef DONT_ENUM
		// No need to check when not extending Object and when on Rhino+dontEnum,
		// as dontEnum is always used to hide fields there.
		for (var i in this)
			iter.call(bind, this[i], i, this);
#else // !DONT_ENUM
		// We use for-in here, but need to filter out what should not be iterated.
		// The loop here uses an inline version of Object#has (See Core.js).
#ifdef EXTEND_OBJECT
		for (var i in this)
#ifdef FIX_PROTO
			// Since __proto__ is faked, it is be iterated and therefore 
			// we need to check for that one too:
			if (PROPERTY_IS_VISIBLE(this, i, this[i] !== this.__proto__ && this[i] !== this.__proto__[i]))
#else // !FIX_PROTO
			if (PROPERTY_IS_VISIBLE(this, i, this[i] !== this.__proto__[i]))
#endif // !FIX_PROTO
				iter.call(bind, this[i], i, this);
#else // !EXTEND_OBJECT
		// Object.prototype is untouched, so we cannot assume __proto__ to always
		// be defined on legacy browsers. Use two versions of the loops for 
		// better performance here:
		if (this.__proto__ == null) {
			for (var i in this)
				IF_PROPERTY_IS_VISIBLE(i, iter.call(bind, this[i], i, this);)
		} else {
			for (var i in this)
#ifdef FIX_PROTO
				// Since __proto__ is faked, it is be iterated and therefore 
				// we need to check for that one too:
				if (PROPERTY_IS_VISIBLE(this, i, this[i] !== this.__proto__ && this[i] !== this.__proto__[i]))
#else // !FIX_PROTO
				if (PROPERTY_IS_VISIBLE(this, i, this[i] !== this.__proto__[i]))
#endif // !FIX_PROTO
					iter.call(bind, this[i], i, this);
		}
#endif // !EXTEND_OBJECT
#endif // !DONT_ENUM
	};

	return {
		_HIDE
		_BEANS
		_generics: true,

		// Base.each is used mostly so functions can be generalized.
		// But that's not enough, since find and others are still called
		// on this.
		// TODO: Find a workaround for this problem!

		/**
		 * The core of all Enumerable functions. TODO: document
		 */
		each: Base.iterate(function(iter, bind) {
			try { (typeof this.length == 'number' ? each_Array : each_Object).call(this, iter, bind); }
			catch (e) { if (e !== Base.stop) throw e; }
			return bind;
		}),

		/**
		 * Searches the list for the first element where the passed iterator
		 * does not return null and returns an object containing key, value and
		 * iterator result for the given entry. This is used in find and remove.
		 */
		findEntry: Base.iterate(function(iter, bind, that) {
			return Base.each(this, function(val, key) {
				this.result = iter.call(bind, val, key, that);
				if (this.result) {
					this.key = key;
					this.value = val;
					throw Base.stop;
				}
			}, {});
		}),

		/**
		 * Calls the passed iterator for each element and returns the first
		 * result of the iterator calls that is not null.
		 */
		find: function(iter, bind) {
			return this.findEntry(iter, bind).result;
		},

		remove: function(iter, bind) {
			var entry = this.findEntry(iter, bind);
			delete this[entry.key];
			return entry.value;
		},

		/**
		 * Collects all elements for which the condition of the passed iterator
		 * or regular expression is true.
		 * This is compatible with JS 1.5's .filter, but adds more flexibility
		 * regarding iterators (as defined in iterate())
		 * TODO: consider collect: similar to filter, but collects the returned
		 * elements if they are != null.
		 * TOOD: See if collect and filter could be joined somehow
		 */
		filter: Base.iterate(function(iter, bind, that) {
			return Base.each(this, function(val, i) {
				if (iter.call(bind, val, i, that))
					this[this.length] = val;
			}, []);
		}),

		/**
		 * Collects the result of the given iterator applied to each of the
		 * elements to an array and returns it.
		 * The difference to map is that it does not add null / undefined values. 
		 * If no iterator is passed, the value is used directly.
		 * This is compatible with JS 1.5's .map, but adds more flexibility
		 * regarding iterators (as defined in iterate())
		 */
		collect: Base.iterate(function(iter, bind, that) {
			return Base.each(this, function(val, i) {
			 	val = iter.call(bind, val, i, that);
				if (val != null)
					this[this.length] = val;
			}, []);
		}),

		/**
		 * Maps the result of the given iterator applied to each of the
		 * elements to an array and returns it.
		 * If no iterator is passed, the value is used directly.
		 * This is compatible with JS 1.5's .map, but adds more flexibility
		 * regarding iterators (as defined in iterate())
		 */
		map: Base.iterate(function(iter, bind, that) {
			return Base.each(this, function(val, i) {
				this[this.length] = iter.call(bind, val, i, that);
			}, []);
		}),

		/**
		 * Returns true if the condition defined by the passed iterator is true
		 * for	all elements, false otherwise.
		 * If no iterator is passed, the value is used directly.
		 * This is compatible with JS 1.5's .every, but adds more flexibility
		 * regarding iterators (as defined in iterate())
		 */
		every: Base.iterate(function(iter, bind, that) {
			return this.find(function(val, i) {
				// as "this" is not used for anything else, use it for bind,
				// so that lookups on the object are faster (according to 
				// benchmarking)
				return !iter.call(this, val, i, that);
			}, bind) == null;
		}),

		/**
		 * Returns true if the condition defined by the passed iterator is true
		 * for one or more of the elements, false otherwise.
		 * If no iterator is passed, the value is used directly.
		 * This is compatible with JS 1.5's .some, but adds more flexibility
		 * regarding iterators (as defined in iterate())
		 */
		some: function(iter, bind) {
			return this.find(iter, bind) != null;
		},

		/**
		 * Returns the maximum value of the result of the passed iterator
		 * applied to each element.
		 * If no iterator is passed, the value is used directly.
		 */
		max: Base.iterate(function(iter, bind, that) {
			return Base.each(this, function(val, i) {
				val = iter.call(bind, val, i, that);
				if (val >= (this.max || val)) this.max = val;
			}, {}).max;
		}),

		/**
		 * Returns the minimum value of the result of the passed iterator
		 * applied to each element. 
		 * If no iterator is passed, the value is used directly.
		 */
		min: Base.iterate(function(iter, bind, that) {
			return Base.each(this, function(val, i) {
				val = iter.call(bind, val, i, that);
				if (val <= (this.min || val)) this.min = val;
			}, {}).min;
		}),

		/**
		 * Collects the values of the given property of each of the elements
		 * in an array and returns it.
		 */
		pluck: function(prop) {
			return this.map(function(val) {
				return val[prop];
			});
		},

		/**
		 * Sorts the elements depending on the outcome of the passed iterator
		 * and returns the sorted list in an array.
		 * Inspired by Prototype.js
		 */
		sortBy: Base.iterate(function(iter, bind, that) {
			return this.map(function(val, i) {
				return { value: val, compare: iter.call(bind, val, i, that) };
			}, bind).sort(function(left, right) {
				var a = left.compare, b = right.compare;
				return a < b ? -1 : a > b ? 1 : 0;
			}).pluck('value');
		}),

		/**
		 * Converts the Enumerable to a normal array.
		 */
		toArray: function() {
			return this.map();
		}
	};
}

#endif // __lang_Enumerable__