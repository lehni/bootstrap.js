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
// TODO: Base.each is used mostly so functions can be generalized.
// But that's not enough, since find and others are still called
// on this.
Enumerable = {
	_HIDE
	_BEANS
	_generics: true,
	// Make sure it's not overriding native functions when injecting into Array
	_preserve: true,

	/**
	 * Searches the list for the first element where the passed iterator
	 * does not return null and returns an object containing key, value and
	 * iterator result for the given entry. This is used in find and remove.
	 * If no iterator is passed, the value is used directly.
	 */
	findEntry: function(iter, bind) {
		var that = this, iter = Base.iterator(iter), ret = null;
		Base.each(this, function(val, key) {
			var res = iter.call(bind, val, key, that);
			if (res) {
				ret = { key: key, value: val, result: res };
				throw Base.stop;
			}
		});
		return ret;
	},

	/**
	 * Calls the passed iterator for each element and returns the first
	 * result of the iterator calls that is not null.
	 * If no iterator is passed, the value is used directly.
	 */
	find: function(iter, bind) {
		var entry = this.findEntry(iter, bind);
		return entry && entry.result;
	},

	contains: function(obj) {
		return !!this.findEntry(obj);
	},

	remove: function(iter, bind) {
		var entry = this.findEntry(iter, bind);
		if (entry) {
			delete this[entry.key];
			return entry.value;
		}
	},

	/**
	 * Collects all elements for which the condition of the passed iterator
	 * or regular expression is true.
	 * This is compatible with JS 1.5's Array#filter
	 */
	filter: function(iter, bind) {
		var that = this;
		return Base.each(this, function(val, i) {
			if (iter.call(bind, val, i, that))
				this[this.length] = val;
		}, []);
	},

	/**
	 * Maps the result of the given iterator applied to each of the
	 * elements to an array and returns it.
	 * If no iterator is passed, the value is used directly.
	 * This is compatible with JS 1.5's Array#map
	 */
	map: function(iter, bind) {
		var that = this;
		return Base.each(this, function(val, i) {
			this[this.length] = iter.call(bind, val, i, that);
		}, []);
	},

	/**
	 * Returns true if the condition defined by the passed iterator is true
	 * for	all elements, false otherwise.
	 * If no iterator is passed, the value is used directly.
	 * This is compatible with JS 1.5's Array#every
	 */
	every: function(iter, bind) {
		var that = this;
		return this.find(function(val, i) {
			// as "this" is not used for anything else, use it for bind,
			// so that lookups on the object are faster (according to 
			// benchmarking)
			return !iter.call(this, val, i, that);
		}, bind || null) == null;
		// See #some for explanation of || null
	},

	/**
	 * Returns true if the condition defined by the passed iterator is true
	 * for one or more of the elements, false otherwise.
	 * If no iterator is passed, the value is used directly.
	 * This is compatible with JS 1.5's Array#some
	 */
	some: function(iter, bind) {
		// Passing null instead of undefined causes bind not to be set to
		// this, as we want the same behavior here as the native Array#some.
		return this.find(iter, bind || null) != null;
	},

	/**
	 * Collects the result of the given iterator applied to each of the
	 * elements to an array and returns it.
	 * The difference to map is that it does not add null / undefined values. 
	 */
	collect: function(iter, bind) {
		var that = this, iter = Base.iterator(iter);
		return Base.each(this, function(val, i) {
		 	val = iter.call(bind, val, i, that);
			if (val != null)
				this[this.length] = val;
		}, []);
	},

	/**
	 * Returns the maximum value of the result of the passed iterator
	 * applied to each element.
	 * If no iterator is passed, the value is used directly.
	 */
	max: function(iter, bind) {
		var that = this;
		return Base.each(this, function(val, i) {
			val = iter.call(bind, val, i, that);
			if (val >= (this.max || val)) this.max = val;
		}, {}).max;
	},

	/**
	 * Returns the minimum value of the result of the passed iterator
	 * applied to each element. 
	 * If no iterator is passed, the value is used directly.
	 */
	min: function(iter, bind) {
		var that = this;
		return Base.each(this, function(val, i) {
			val = iter.call(bind, val, i, that);
			if (val <= (this.min || val)) this.min = val;
		}, {}).min;
	},

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
	sortBy: function(iter, bind) {
		var that = this;
		// TODO: Does not work as generics
		return this.map(function(val, i) {
			return { value: val, compare: iter.call(bind, val, i, that) };
		}, bind).sort(function(left, right) {
			var a = left.compare, b = right.compare;
			return a < b ? -1 : a > b ? 1 : 0;
		}).pluck('value');
	},

	/**
	 * Converts the Enumerable to a normal array.
	 */
	toArray: function() {
		return this.map();
	}
};

#endif // __lang_Enumerable__