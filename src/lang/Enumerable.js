#ifndef __lang_Enumerable__
#define __lang_Enumerable__

#comment Use macros to produce different version of the code bellow,
#comment depending on wether SET_ITERATOR is set or not.
#ifdef SET_ITERATOR
#comment The field 'name' on the 'bind' object is set to the iterator before
#comment iteration. We can call it directly instead using #call.
#comment This leads to better performance (2x on Firefox), and even more  on
#comment legacy browsers where we can avoid the emulated Function.call.
#define ITERATOR(ITER, BIND, VALUE, KEY, SELF, NAME) BIND.NAME(VALUE, KEY, SELF)
#define ITERATE(ITER, NAME) iterate(ITER, NAME)
#else // !SET_ITERATOR
#comment Call the iterator funciton on the bind object through Function.call.
#comment This is cleanear but slower than the SET_ITERATOR hack.
#define ITERATOR(ITER, BIND, VALUE, KEY, SELF, NAME) ITER.call(BIND, VALUE, KEY, SELF)
#define ITERATE(ITER, NAME) iterate(ITER)
#endif // !SET_ITERATOR

////////////////////////////////////////////////////////////////////////////////
// Enumerable

/**
 * A special constant, to be thrown by closures passed to each()
 * Inspired by Prototype.js
 *
 * $continue is not implemented, as the same functionality can achieved
 * by using return in the closure. In prototype, the implementation of $continue
 * also leads to a huge speed decrease, as the closure is wrapped in another
 * closure that does nothing else than handling $continue.
 */
$break = {};

function $each(obj, iter, bind) {
	return obj ? Enumerable.each.call(obj, iter, bind) : bind;
};

/**
 * The Enumerable interface. To add enumerable functionality to any prototype,
 * just use Constructor.inject(Enumerable);
 * This adds the function .each() that can handle both arrays (detected through
 * .length) and dictionaries (if it's not an array, enumerating with for-in).
 *
 * Inspired by Prototype.js.
 */
Enumerable = (function() {
	/**
	 * Converts the argument to an iterator function. If none is specified,
	 * the identity function is returned. 
	 * This supports regular expressions, normal functions, which are
	 * returned unmodified, and values to compare to.
	 * Wherever this private function is used in the Enumerable functions
	 * bellow, a RegExp object, a Function or null may be passed.
	 */
	function iterator(iter) {
		if (!iter) return function(val) { return val };
		switch ($typeof(iter)) {
		case 'function': return iter;
		case 'regexp': return function(val) { return iter.test(val) };
		}
		return function(val) { return val == iter };
	}

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
#ifdef SET_ITERATOR
	function iterate(fn, name) {
#else
	function iterate(fn) {
#endif
#if defined(SET_ITERATOR) && defined(DONT_ENUM)
		// dontEnum all set iterators once and for all on browsers:
		Base.prototype.dontEnum(true, name);
#endif // APPLY_ITERATOR && DONT_ENUM
		return function(iter, bind) {
			iter = iterator(iter);
			if (!bind) bind = this;
#ifdef SET_ITERATOR
			// Backup previous value of the field, and set iterator.
			var prev = bind[name];
			bind[name] = iter;
#ifdef HELMA
			// On Helma, we can only dontEnum once the property is defined.
			bind.dontEnum(name);
#endif // HELMA
#endif// !SET_ITERATOR
			// Interesting benchmark observation: The loops seem execute 
			// faster when called on the object (this), so outsource to
			// the above functions each_Array / each_Object here.
			// pass this twice, so it can be recieved as 'self' in the iterating
			// functions, to be passed to the iterator (and being able to use 
			// 'this' in .each differently)
#ifdef SET_ITERATOR
			// Allways restore previous value in the end.
			try { return fn.call(this, iter, bind, this); }
			finally { bind[name] = prev; }
#else // !SET_ITERATOR
			return fn.call(this, iter, bind, this);
#endif// !SET_ITERATOR
		};
	}

	var each_Array = Array.prototype.forEach || function(iter, bind) {
		for (var i = 0; i < this.length; i++)
			ITERATOR(iter, bind, this[i], i, this, __each);
	};

	var each_Object = function(iter, bind) {
#ifdef DONT_ENUM
		// We use for-in here, but need to filter out what should not be iterated.
		// Object#dontEnum defines a method to flag such a fields, and Object#has
		// a way to find out for any given key if it is enumerable or not.
		// The loop here uses an inline version of Object#has (See Core).  
		var entries = this._dontEnum || {};
		for (var i in this) {
			var val = this[i], entry = entries[i];
			// Skip dontEnum fields.
			// This line here is similar to Base.prototype.has
			if (!entry || entry.allow && entry.object[i] !== this[i])
				ITERATOR(iter, bind, val, i, this, __each);
		}
#elif !defined(HELMA)
		// We use for-in here, but need to filter out what should not be iterated.
		// The loop here uses an inline version of Object#has (See Core).
		for (var i in this) {
			var val = this[i];
			if (val !== this.__proto__[i]AND_NAME_IS_VISIBLE(i))
				ITERATOR(iter, bind, val, i, this, __each);
		}
#else // HELMA
		// No need to check when not extending Object and when on Helma as
		// dontEnum is always used to hide fields there.
		for (var i in this)
			ITERATOR(iter, bind, this[i], i, this, __each);
#endif
	};

	return {
		/**
		 * The core of all Enumerable functions. TODO: document
		 */
		each: ITERATE(function(iter, bind) {
			try { (this.length != null ? each_Array : each_Object).call(this, iter, bind); }
			catch (e) { if (e !== $break) throw e; }
			return bind;
		}, '__each'),

		/**
		 * Searches the list for the first element where the condition of the
		 * passed iterator is met and returns its key / value pair as an object:
		 * { key: ... , value: ... }
		 */
		find: ITERATE(function(iter, bind, self) {
			return this.each(function(val, key) {
				if (ITERATOR(iter, bind, val, key, self, __find)) {
					this.found = { key: key, value: val };
					throw $break;
				}
			}, {}).found || null;
		}, '__find'),

		/**
		 * Returns true if the condition defined by the passed iterator is true
		 * for one or more of the elements, false otherwise.
		 * If no iterator is passed, the value is used directly.
		 * This is compatible with JS 1.5's .some, but adds more flexibility
		 * regarding iterators (as defined in iterator())
		 */
		some: function(iter, bind) {
			// when injecting into Array, there might already be a definition of
			// .some() (Firefox JS 1.5+), so use it as it's faster and does the
			// same, except for the iterator conversion which is handled by
			// iterator() here:
			return this.$super ? this.$super(iterator(iter), bind) :
				!!this.find(iter, bind);
		},

		/**
		 * Returns true if the condition defined by the passed iterator is true
		 * for	all elements, false otherwise.
		 * If no iterator is passed, the value is used directly.
		 * This is compatible with JS 1.5's .every, but adds more flexibility
		 * regarding iterators (as defined in iterator())
		 */
		every: ITERATE(function(iter, bind, self) {
			// Just like in .some, use .every if it's there
			return this.$super ? this.$super(iter, bind) : !this.find(function(val, i) {
				// as "this" is not used for anything else, use it for bind,
				// so that lookups on the object are faster (according to 
				// benchmarking)
				return ITERATOR(iter, this, val, i, self, __every);
			}, bind);
		}, '__every'),

		/**
		 * Collects the result of the given iterator applied to each of the
		 * elements in an array and returns it.
		 * If no iterator is passed, the value is used directly.
		 * This is compatible with JS 1.5's .map, but adds more flexibility
		 * regarding iterators (as defined in iterator())
		 */
		map: ITERATE(function(iter, bind, self) {
			// Just like in .some, use .map if it's there
			return this.$super ? this.$super(iter, bind) : this.each(function(val, i) {
				this.push(ITERATOR(iter, bind, val, i, self, __map));
			}, []);
		}, '__map'),

		/**
		 * Collects all elements for which the condition of the passed iterator
		 * or regular expression is true.
		 * This is compatible with JS 1.5's .filter, but adds more flexibility
		 * regarding iterators (as defined in iterator())
		 */
		filter: ITERATE(function(iter, bind, self) {
			// Just like in .some, use .map if it's there
			return this.$super ? this.$super(iter, bind) : this.each(function(val, i) {
				if (ITERATOR(iter, bind, val, i, self, __filter)) this.push(val);
			}, []);
		}, '__filter'),

		/**
		 * Returns the maximum value of the result of the passed iterator
		 * applied to each element.
		 * If no iterator is passed, the value is used directly.
		 */
		max: ITERATE(function(iter, bind, self) {
			return this.each(function(val, i) {
				val = ITERATOR(iter, bind, val, i, self, __max);
				if (val >= (this.max || val)) this.max = val;
			}, {}).max;
		}, '__max'),

		/**
		 * Returns the minimum value of the result of the passed iterator
		 * applied to each element. 
		 * If no iterator is passed, the value is used directly.
		 */
		min: ITERATE(function(iter, bind, self) {
			return this.each(function(val, i) {
				val = ITERATOR(iter, bind, val, i, self, __min);
				if (val <= (this.min || val)) this.min = val;
			}, {}).min;
		}, '__min'),

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
		sortBy: ITERATE(function(iter, bind, self) {
			return this.map(function(val, i) {
				return { value: val, compare: ITERATOR(iter, bind, val, i, self, __sortBy) };
			}, bind).sort(function(left, right) {
				var a = left.compare, b = right.compare;
				return a < b ? -1 : a > b ? 1 : 0;
			}).pluck('value');
		}, '__sortBy'),

		/**
		 * Swaps two elements of the object at the given indices, and returns
		 * the value that is placed at the first index.
		 */
		swap: function(i, j) {
			var tmp = this[j];
			this[j] = this[i];
			this[i] = tmp;
			return tmp;
		},

		/**
		 * Converts the Enumerable to a normal array.
		 */
		toArray: function() {
			return this.map();
		}
	}
})();

#endif // __lang_Enumerable__