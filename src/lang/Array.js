#ifndef __lang_Array__
#define __lang_Array__

#include "Enumerable.js"

////////////////////////////////////////////////////////////////////////////////
// Array

/**
 * Converts the list to an array. various types are supported. 
 * Inspired by Prototype.js
 */
function $A(list, start, end) {
	if (!list) return [];
	else if (list.toArray && !start && end == null) return list.toArray();
	var res = [];
	if (!start) start = 0;
	if (end == null) end = list.length;
	for (var i = start; i < end; i++)
		res[i - start] = list[i];
	return res;
}

// Use a container to mix the functions together, as we're referencing
// Array.prototype.* bellow, which would get overridden otherwise
Array.methods = {};

// Inherit the full Enumerable interface
Array.methods.inject(Enumerable);

// Add some more:
Array.methods.inject({
	// tell $typeof what to return for arrays.
	_type: "array",

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
		if (iter && !/function|regexp/.test($typeof(iter))) return this[this.indexOf(iter)];
		else return Enumerable.find.call(this, iter);
	},

	remove: function(obj) {
		var i = this.indexOf(obj);
		if (i != -1) return this.splice(i, 1);
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
		// do not rely on obj to have .each set, as it might come from another
		// frame.
		return $each(obj, function(val) {
			this.push(val);
		}, this);
	},

	/**
	 * adds all elements in the passed array, if they are not contained
	 * in the array already.
	 */
	include: function(obj) {
		return $each(obj, function(val) {
			if (this.indexOf(val) == -1) this.push(val);
		}, this);
	},

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
	 * Returns a copy of the array containing the elements in shuffled sequence.
	 */
	shuffle: function() {
		var res = this.clone();
		var i = this.length;
		while (i--) res.swap(i, $random(0, i));
		return res;
	}
});

// now inject the mix
Array.inject(Array.methods, true);

#ifdef BROWSER_LEGACY

////////////////////////////////////////////////////////////////////////////////
// Array Legacy

if (!Array.prototype.push) {
	Array.inject({
		push: function() {
			for (var i = 0; i < arguments.length; i++)
				this[this.length] = arguments[i];
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
			for (var i = 0;i < this.length - 1; i++)
				this[i]=this[i + 1];
			delete this[this.length - 1];
			this.length--;
			return old;
		},

		unshift: function() {
			for (var i = this.length - 1;i >= 0; i--)
				this[i + arguments.length] = this[i];
			for (i = 0; i < arguments.length; i++)
				this[i] = arguments[i];
			return this.length;
		},

		splice: function(start, del, items) {
			var res = [];
			for (var i = 0; i < del; i++)
				res[i] = this[i + start];
			for (i = start; i < this.length - del; i ++)
				this[i] = this[i + del];
			this.length -= del;
			if(arguments.length > 2) {
				var len = arguments.length - 2;
				for (i = this.length - 1; i >= start; i--)
					this[i + len] = this[i];
				for (i = 0; i < len; i++)
					this[i + start] = arguments[i + 2];
			}
			return res;
		},

		slice: function(start, end) {
			if (start < 0) start += this.length;
			if (end < 0) end += this.length;
			else if (end == null) end = this.length;
			var res = [];
			for (var i = start; i < end; i++)
				res[i - start] = this[i];
			return res;
		}
	}, true);
}

#endif // BROWSER_LEGACY

#endif // __lang_Array__