#ifndef __lang_Enumerable__
#define __lang_Enumerable__

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
	function iterate(fn, name) {
#ifndef HELMA
		// dontEnum all iterators once and for all on browsers:
		Object.prototype.dontEnum(true, name);
#endif
		return function(iter, bind) {
			iter = iterator(iter);
			if (!bind) bind = this;
			var prev = bind[name];
			bind[name] = iter;
			// HACK: If the object does not allow setting of values,
			// create a new unsealed object that inherits from it.
			/*
			if (bind[name] != iter) {
				bind = bind.extend();
				bind[name] = iter;
			}
			*/
#ifdef HELMA
			// On the server, we can only dontEnum once the property is defined.
			bind.dontEnum(name);
#endif
			// Interesting benchmark observation: The loops seem execute 
			// faster when called on the object (this), so outsource to
			// the above functions each_Array / each_Object here.
			// pass this twice, so it can be recieved as "that" in the iterating
			// functions, to be passed to the iterator (and being able to use 
			// "this" in .each differently)
			try { return fn.call(this, iter, bind, this); }
			finally { bind[name] = prev; }
		};
	}

	var each_Array = Array.prototype.forEach || function(iter, bind) {
		for (var i = 0; i < this.length; i++)
			bind.__each(this[i], i, this);
	};

	var each_Object = function(iter, bind) {
		// We use for-in here, but need to filter out what does not belong
		// to the object itself. This is done by comparing the value with
		// the value of the same name in the prototype. If the value is
		// equal it's defined in one of the prototypes, not the object
		// itself.
#ifndef HELMA
		var entries = this._dontEnum || {};
		for (var i in this) {
			var val = this[i], entry = entries[i];
			// added properties. This line here is the same as Object.prototype.has
			if (!entry || entry.allow && entry.object[i] !== this[i])
				bind.__each(val, i, this);
		}
#else // HELMA
		// no need to check on the server as dontEnum is allways used to hide
		for (var i in this)
			bind.__each(this[i], i, this);
#endif // HELMA
	};

	return {
		/**
		 * The core of all Enumerable functions. TODO: document
		 */
		each: iterate(function(iter, bind) {
			try { (this.length != null ? each_Array : each_Object).call(this, iter, bind); }
			catch (e) { if (e !== $break) throw e; }
			return bind;
		}, "__each"),

		/**
		 * Searches the list for the first element where the condition of the
		 * passed iterator is met and returns its key / value pair as an object:
		 * { key: ... , value: ... }
		 */
		find: iterate(function(iter, bind, that) {
			return this.each(function(val, key) {
				if (bind.__find(val, key, that)) {
					this.found = { key: key, value: val };
					throw $break;
				}
			}, {}).found;
		}, "__find"),

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
				this.find(iter, bind) !== undefined;
		},

		/**
		 * Returns true if the condition defined by the passed iterator is true
		 * for	all elements, false otherwise.
		 * If no iterator is passed, the value is used directly.
		 * This is compatible with JS 1.5's .every, but adds more flexibility
		 * regarding iterators (as defined in iterator())
		 */
		every: iterate(function(iter, bind, that) {
			// Just like in .some, use .every if it's there
			return this.$super ? this.$super(iter, bind) : this.find(function(val, i) {
				// as "this" is not used for anything else, use it for bind,
				// so that lookups on the object are faster (according to 
				// benchmarking)
				return this.__every(val, i, that);
			}, bind) === undefined;
		}, "__every"),

		/**
		 * Collects the result of the given iterator applied to each of the
		 * elements in an array and returns it.
		 * If no iterator is passed, the value is used directly.
		 * This is compatible with JS 1.5's .map, but adds more flexibility
		 * regarding iterators (as defined in iterator())
		 */
		map: iterate(function(iter, bind, that) {
			// Just like in .some, use .map if it's there
			return this.$super ? this.$super(iter, bind) : this.each(function(val, i) {
				this.push(bind.__map(val, i, that));
			}, []);
		}, "__map"),

		/**
		 * Collects all elements for which the condition of the passed iterator
		 * or regular expression is true.
		 * This is compatible with JS 1.5's .filter, but adds more flexibility
		 * regarding iterators (as defined in iterator())
		 */
		filter: iterate(function(iter, bind, that) {
			// Just like in .some, use .map if it's there
			return this.$super ? this.$super(iter, bind) : this.each(function(val, i) {
				if (bind.__filter(val, i, that)) this.push(val);
			}, []);
		}, "__filter"),

		/**
		 * Returns the maximum value of the result of the passed iterator
		 * applied to each element.
		 * If no iterator is passed, the value is used directly.
		 */
		max: iterate(function(iter, bind, that) {
			return this.each(function(val, i) {
				val = bind.__max(val, i, that);
				if (val >= (this.max || val)) this.max = val;
			}, {}).max;
		}, "__max"),

		/**
		 * Returns the minimum value of the result of the passed iterator
		 * applied to each element. 
		 * If no iterator is passed, the value is used directly.
		 */
		min: iterate(function(iter, bind, that) {
			return this.each(function(val, i) {
				val = bind.__min(val, i, that);
				if (val <= (this.min || val)) this.min = val;
			}, {}).min;
		}, "__min"),

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
		sortBy: iterate(function(iter, bind, that) {
			return this.map(function(val, i) {
				return { value: val, compare: this.__sortBy(val, i, that) };
			}, bind).sort(function(left, right) {
				var a = left.compare, b = right.compare;
				return a < b ? -1 : a > b ? 1 : 0;
			}).pluck('value');
		}, "__sortBy"),

		/**
		 * Swaps two elements of the object at the given indices
		 */
		swap: function(i, j) {
			var tmp = this[i];
			this[i] = this[j];
			this[j] = tmp;
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