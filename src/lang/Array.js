#ifndef __lang_Array__
#define __lang_Array__

#include "Enumerable.js"

////////////////////////////////////////////////////////////////////////////////
// Array

Array.inject(Enumerable).inject({
	// tell $typeof what to return for arrays.
	_type: 'array',

	/**
	 * Returns the index of the given object if found, -1 otherwise.
	 */
	indexOf: Array.prototype.indexOf || function(obj, i) {
		i = i || 0;
		if (i < 0) i = Math.max(0, this.length + i);
		for (i; i < this.length; i++) if (this[i] == obj) return i;
		return -1;
	},

	/**
	 * Returns the last index of the given object if found, -1 otherwise.
	 */
	lastIndexOf: Array.prototype.lastIndexOf || function(obj, i) {
		i = i != null ? i : this.length - 1;
		if (i < 0) i = Math.max(0, this.length + i);
		for (i; i >= 0; i--) if (this[i] == obj) return i;
		return -1;
	},

	find: function(iter) {
		// use the faster indexOf in case we're not using iterator functions.
		if (iter && !/^(function|regexp)$/.test($typeof(iter))) {
			var i = this.indexOf(iter);
			return i == -1 ? null : { key: i, value: this[i] };
		}
		return Enumerable.find.call(this, iter);
	},

	remove: function(iter) {
		var entry = this.find(iter);
		if (entry) return this.splice(entry.key, 1)[0];
	},

	/**
	 * Overrides the definition in Enumerable.toArray with a more efficient
	 * version.
	 */
	toArray: function() {
#ifdef BROWSER
		var res = this.concat([]);
		// fix Opoera bug where arguments are arrays but do not concatenate correctly
		return res.length == this.length ? res : Enumerable.toArray.call(this);
#else
		return this.concat([]);
#endif
	},

	/**
	 * Clones the array.
	 */
	clone: function() {
		return this.toArray();
	},

	/**
	 * Clears the array.
	 */
	clear: function() {
		this.length = 0;
	},

	/**
	 * Returns the first element of the array.
	 */
	first: function() {
		return this[0];
	},

	/**
	 * Returns the last element of the array.
	 */
	last: function() {
		return this[this.length - 1];
	},

	/**
	 * Returns a compacted version of the array containing only
	 * elements that are not null.
	 */
	compact: function() {
		return this.filter(function(value) {
			return value != null;
		});
	},

	/**
	 * Appends the elments of the given enumerable object.
	 */
	append: function(obj) {
		// Do not rely on obj to have .each set, as it might come from another
		// frame.
		return $each(obj, function(val) {
			this.push(val);
		}, this);
	},

	/**
	 * Creates an object containing the array's values assigned to the
	 * given keys assigned.
	 */
	assign: function(keys) {
		var that = this, index = 0;
		return keys.each(function(key) {
			this[key] = that[index++];
			if (index == that.length) throw $break;
		}, {});
	},

	/**
	 * adds all elements in the passed array, if they are not contained
	 * in the array already.
	 */
	/* TODO: needed?
	include: function(obj) {
		return $each(obj, function(val) {
			if (this.indexOf(val) == -1) this.push(val);
		}, this);
	},
	*/

	/**
	 * Flattens multi-dimensional array structures by breaking down each
	 * sub-array into the main array.
	 */
	flatten: function() {
		return this.each(function(val) {
			if (val != null && val.flatten) this.append(val.flatten());
			else this.push(val);
		}, []);
	},

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
	 * Returns a copy of the array containing the elements in shuffled sequence.
	 */
	shuffle: function() {
		var res = this.clone();
		var i = this.length;
		while (i--) res.swap(i, Math.rand(0, i));
		return res;
	},

	statics: {
		/**
		 * Converts the list to an array. Various types are supported. 
		 */
		create: function(list, start, end) {
			if (!list) return [];
			if (end == null) end = list.length;
			if (list.toArray && !start && end == list.length)
				return list.toArray();
			if (!start) start = 0;
			var res = [];
			for (var i = start; i < end; i++)
				res[i - start] = list[i];
			return res;
		},

		extend: function(src) {
			// On IE browsers, we cannot directly inherit from Array
			// by setting ctor.prototype = new Array(), as setting of #length
			// on such instances is ignored.
			// Simulate extending of Array, by actually extending Base and
			// injecting from Array.
			// Fields that are hidden in Array.prototype need to be explicitely
			// injected.
			// Subclasses need to define length = 0 in their constructors.
			// Not supported: concat (Safari breaks it)
			// Explicitely inject Enumerable as it defines dontEnum. and 
			// its fields wont found when iterating through Array.prototype.
			// This is only really needed when dontEnum is used.
			return ['push','pop','shift','unshift','sort','reverse',
				'join','slice','splice','some','every','map','filter',
				'indexOf','lastIndexOf'].each(function(name) {
				this.prototype[name] = Array.prototype[name];
			}, Base.extend(Array.prototype)).inject(Enumerable).inject(src, Array);
		}
	}
});

// Short-cut to Array.create
$A = Array.create;

#ifdef BROWSER_LEGACY

////////////////////////////////////////////////////////////////////////////////
// Array Legacy

if (!Array.prototype.push) {
	/**
	 * Simulate stanadard Array methods on legacy browsers.
	 * All these methods explicitely alter length, as they might be used for
	 * array-like objects (e.g. the HtmlElements array).
	 */
	Array.inject({
		push: function() {
			for (var i = 0; i < arguments.length; i++)
				this[this.length++] = arguments[i];
			return this.length;
		},

		pop: function() {
			var i = this.length - 1;
			var old = this[i];
			delete this[i];
			this.length = i;
			return old;
		},

		shift: function() {
			var old = this[0];
			for (var i = 0; i < this.length - 1; i++)
				this[i] = this[i + 1];
			delete this[this.length - 1];
			this.length--;
			return old;
		},

		unshift: function() {
			var len = this.length, num = arguments.length;
			this.length += num;
			for (var i = len - 1; i >= 0; i--)
				this[i + num] = this[i];
			for (i = 0; i < num; i++)
				this[i] = arguments[i];
			return this.length;
		},

		splice: function(start, del) {
			var res = new Array(del), len = this.length;
			// Collect all the removed elements.
			for (var i = 0; i < del; i++)
				res[i] = this[i + start];
			var num = arguments.length - 2;
			if (num > 0) del -= num;
			if (del > 0) {
				// Move the entries up by the amount of entries to remove.
				for (i = start; i < len - del; i ++)
					this[i] = this[i + del];
				// Delete the entries that are not used any more.
				// This is needed for pseudo arrays.
				for (i = len - del; i < len; i++)
					delete this[i];
				this.length = len - del;
			} else {
				// Negative del means there are more new entries than old
				// entries to remove.
				// Adjust length first for speed up on native arrays,
				// by forcing reallocation to the righ sice.
				this.length = len - del;
				// Move the entries down by the emount of new entries - the 
				// amount of entries to remove. 
				for (i = len - 1; i >= start; i--)
					this[i - del] = this[i];
			}
			// Add the new entries
			if (num > 0)
				for (i = 0; i < num; i++)
					this[i + start] = arguments[i + 2];
			return res;
		},

		/**
		 * On legacy IE, slice does not work correctly with negative indices.
		 */
		slice: function(start, end) {
			if (start < 0) start += this.length;
			if (end < 0) end += this.length;
			else if (end == null) end = this.length;
			var res = new Array(end - start);
			for (var i = start; i < end; i++)
				res[i - start] = this[i];
			return res;
		}
	});
}

#endif // BROWSER_LEGACY

#endif // __lang_Array__