#ifndef __lang_Array__
#define __lang_Array__

#include "Enumerable.js"
#include "Hash.js"

#ifdef BROWSER_LEGACY

////////////////////////////////////////////////////////////////////////////////
// Array Legacy

/**
 * Simulate stanadard Array methods on legacy browsers.
 * All these methods explicitely alter length, as they might be used for
 * array-like objects (e.g. the HtmlElements array).
 */
if (!Array.prototype.push) {
	Array.inject({
		push: function() {
			for (var i = 0, j = arguments.length; i < j; i++)
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
			for (var i = 0, j = this.length - 1; i < j; i++)
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
				for (i = start, j = len - del; i < j; i ++)
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

////////////////////////////////////////////////////////////////////////////////
// Array

Array.inject(new function() {
	var proto = Array.prototype;
	// Do not use Hash.create, as this produces as Hash that hides all Enumerable
	// methods from inject()! ( var fields = Hash.create(Enumerable, {...}) ).
	// Instead, use the generics in Base and Hash.
	var fields = Hash.merge(Base.clone(Enumerable), {
		_generics: true,

		// tell $typeof what to return for arrays.
		_type: 'array',

		/**
		 * Returns the index of the given object if found, -1 otherwise.
		 */
		indexOf: proto.indexOf || function(obj, i) {
			i = i || 0;
			if (i < 0) i = Math.max(0, this.length + i);
			for (var j = this.length; i < j; i++)
				if (this[i] == obj) return i;
			return -1;
		},

		/**
		 * Returns the last index of the given object if found, -1 otherwise.
		 */
		lastIndexOf: proto.lastIndexOf || function(obj, i) {
			i = i != null ? i : this.length - 1;
			if (i < 0) i = Math.max(0, this.length + i);
			for (; i >= 0; i--)
				if (this[i] == obj) return i;
			return -1;
		},

		/*
		 * Faster, array-optimized versions of filter, map, every, and some,
		 * relying on the native definitions if available.
		 */
		filter: ITERATE(proto.filter || function(iter, bind, that) {
			var res = [];
			for (var i = 0, j = this.length; i < j; i++)
				if (ITERATOR(iter, bind, this[i], i, that, __filter))
					res[res.length] = this[i];
			return res;
		}, '__filter'),

		map: ITERATE(proto.map || function(iter, bind, that) {
			var res = new Array(this.length);
			for (var i = 0, j = this.length; i < j; i++)
				res[i] = ITERATOR(iter, bind, this[i], i, that, __map);
			return res;
		}, '__map'),

		every: ITERATE(proto.every || function(iter, bind, that) {
			for (var i = 0, j = this.length; i < j; i++)
				if (!ITERATOR(iter, bind, this[i], i, that, __every))
					return false;
			return true;
		}, '__every'),

		some: ITERATE(proto.some || function(iter, bind, that) {
			for (var i = 0, j = this.length; i < j; i++)
				if (ITERATOR(iter, bind, this[i], i, that, __some))
					return true;
			return false;
		}, '__some'),

		find: function(iter) {
			// use the faster indexOf in case we're not using iterator functions.
			if (iter && !/^(function|regexp)$/.test($typeof(iter))) {
				var i = this.indexOf(iter);
				return i != -1 ? { key: i, value: this[i] } : null;
			}
			// TODO: this.base? Speed?
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
			// fix Opoera bug where arguments are arrays but do not
			// concatenate correctly (a new array is returned with [0] == this).
			return res[0] == this ? Enumerable.toArray.call(this) : res;
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
			// Do not rely on obj to have .each set, as it might come from
			// another frame.
			return Base.each(obj, function(val) {
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
			return Base.each(obj, function(val) {
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
		 * Returns a copy of the array containing the elements in
		 * shuffled sequence.
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
			create: function(list) {
				if (!list) return [];
				if (list.toArray)
					return list.toArray();
				var res = [];
				for (var i = 0; i < list.length; i++)
					res[i] = list[i];
				return res;
			},

			extend: function(src) {
				// On IE browsers, we cannot directly inherit from Array
				// by setting ctor.prototype = new Array(), as setting of #length
				// on such instances is ignored.
				// Simulate extending of Array, by actually extending Base and
				// injecting the Array fields, which explicitely contain the
				// native functions too (see bellow).
				// Not supported: concat (Safari breaks it)
				var ret = Base.extend(fields).inject(src);
				// The subclass can use the normal extend again:
				ret.extend = Function.extend;
				return ret;
			}
		}
	});
	// Fields that are hidden in Array.prototype are explicitely copied over,
	// so that they can be inherited in extend() above, and generics are created
	// for them too.
	['push','pop','shift','unshift','sort','reverse','join','slice','splice','toString'].each(function(name) {
		fields[name] = proto[name];
	});
	// length is set so instances of array have it set to 0 to begin with.
	// (any length modifying operation on them like #push will then
	// define / modify the length field in the insance). We cannot set it in the
	// Hash above, as this would make Base.each believe it's an array like object.
	fields.length = 0;
	return fields;
});

// Short-cut to Array.create
$A = Array.create;

#endif // __lang_Array__