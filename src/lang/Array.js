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
			for (var i = 0, l = arguments.length; i < l; ++i)
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
			for (var i = 0, l = this.length - 1; i < l; ++i)
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
			for (i = 0; i < num; ++i)
				this[i] = arguments[i];
			return this.length;
		},

		splice: function(start, del) {
			var res = new Array(del), len = this.length;
			// Collect all the removed elements.
			for (var i = 0; i < del; ++i)
				res[i] = this[i + start];
			var num = arguments.length - 2;
			if (num > 0) del -= num;
			if (del > 0) {
				// Move the entries up by the amount of entries to remove.
				for (i = start, l = len - del; i < l; i ++)
					this[i] = this[i + del];
				// Delete the entries that are not used any more.
				// This is needed for pseudo arrays.
				for (i = len - del; i < len; ++i)
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
				for (i = 0; i < num; ++i)
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
			for (var i = start; i < end; ++i)
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
	// methods from #inject, since they define _hide!
	// ( var fields = Hash.create(Enumerable, {...}) )
	// Instead, use the generics in Hash to fill a normal object.
	
	// TODO: There is a problem on browsers when using EXTEND_OBJECT and DONT_ENUM
	// here, since Base#clone will then be dontEnumed and Hash.merge will therefore
	// not iterate over the new definiton bellow...

	var fields = Hash.merge({}, Enumerable, {
		_generics: true,
		// tell Base.type what to return for arrays.
		_type: 'array',

		/**
		 * Returns the index of the given object if found, -1 otherwise.
		 */
		indexOf: proto.indexOf || function(obj, i) {
			i = i || 0;
			if (i < 0) i = Math.max(0, this.length + i);
			for (var l = this.length; i < l; ++i)
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
			for (var i = 0, l = this.length; i < l; ++i)
				if (ITERATOR(iter, bind, this[i], i, that, __filter))
					res[res.length] = this[i];
			return res;
		}, '__filter'),

		map: ITERATE(proto.map || function(iter, bind, that) {
			var res = new Array(this.length);
			for (var i = 0, l = this.length; i < l; ++i)
				res[i] = ITERATOR(iter, bind, this[i], i, that, __map);
			return res;
		}, '__map'),

		every: ITERATE(proto.every || function(iter, bind, that) {
			for (var i = 0, l = this.length; i < l; ++i)
				if (!ITERATOR(iter, bind, this[i], i, that, __every))
					return false;
			return true;
		}, '__every'),

		some: ITERATE(proto.some || function(iter, bind, that) {
			for (var i = 0, l = this.length; i < l; ++i)
				if (ITERATOR(iter, bind, this[i], i, that, __some))
					return true;
			return false;
		}, '__some'),

		reduce: proto.reduce || function(fn, value) {
			var i = 0;
			if (arguments.length < 2 && this.length) value = this[i++];
			for (var l = this.length; i < l; i++)
				value = fn.call(null, value, this[i], i, this);
			return value;
		},

		findEntry: function(iter, bind) {
			// Use the faster indexOf in case we're not using iterator functions.
			if (iter && !/^(function|regexp)$/.test(Base.type(iter))) {
				var i = this.indexOf(iter);
				// Pretend we were using a iterator function returning true when 
				// the value matches iter, false otherwise.
				// See Enumerable#findEntry for more explanations.
				return { key: i != -1 ? i : null, value: this[i], result: i != -1 };
			}
			// Do not use this.base, as we might call this on non-arrays
			return Enumerable.findEntry.call(this, iter, bind);
		},

		remove: function(iter, bind) {
			var entry = this.findEntry(iter, bind);
			if (entry.key != null)
				this.splice(entry.key, 1);
			return entry.value;
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
		 * Appends the items of the passed array.
		 */
		append: function(items) {
			// It would be nice if calling push with the items of the array
			// as arguments would work, but it does not for non-arrays:
			// this.push.apply(this, items);
			for (var i = 0, l = items.length; i < l; ++i)
				this.push(items[i]);
			return this;
		},

		/**
		 * Removes all objects contained in items.
		 */
		subtract: function(items) {
			for (var i = 0, l = items.length; i < l; ++i)
				// TODO: Conflict between Array#remove and DomElement(s)#remove. Resolve!
				Array.remove(this, items[i]);
			return this;
		},

		/**
		 * Removes all objects from this array that are not contained in items.
		 */
		intersect: function(items) {
			for (var i = this.length - 1; i >= 0; i--)
				if (!items.find(this[i]))
					this.splice(i, 1);
			return this;
		},

		/**
		 * Creates an object containing the array's values associated to the
		 * given keys.
		 */
		associate: function(obj) {
			if (obj.length != null) {
				var that = this;
				return Base.each(obj, function(name, index) {
					this[name] = that[index];
					if (index == that.length) throw Base.stop;
				}, {});
			} else {
				obj = Hash.create(obj);
				// Use Base.each since this is also used for generics
				return Base.each(this, function(val) {
					var type = Base.type(val);
					obj.each(function(hint, name) {
						if (hint == 'any' || type == hint) {
							this[name] = val;
							delete obj[name];
							throw Base.stop;
						}
					}, this);
				}, {});
			}
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
			// Make it generics friendly through Array.each
			return Array.each(function(val) {
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
				if (!Base.check(list)) return [];
				if (Base.type(list) == 'array') return list;
				if (list.toArray)
					return list.toArray();
				if (list.length != null) {
					var res = [];
					for (var i = 0, l = list.length; i < l; ++i)
						res[i] = list[i];
				} else {
					res = [list];
				}
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
				var ret = Base.extend(extend, src);
				// The subclass can use the normal extend again:
				ret.extend = Function.extend;
				return ret;
			}
		}
	});
	// Fields that are hidden in Array.prototype are explicitely copied over,
	// so that they can be inherited in extend() above, and generics are created
	// for them too.
	['push','pop','shift','unshift','sort','reverse','join','slice','splice','concat'].each(function(name) {
		fields[name] = proto[name];
	});
	var extend = Base.clone(fields);
	// length is set so instances of array have it set to 0 to begin with.
	// (any length modifying operation on them like #push will then
	// define / modify the length field in the insance). We cannot set it in the
	// Hash above, as this would make Base.each believe it's an array like object.
	extend.length = 0;
	// The native toString does not work for classes inheriting from Array.
	// but luckily join does the same and works.
	extend.toString = proto.join;
	return fields;
});

#ifdef DEFINE_GLOBALS

// Short-cut to Array.create
$A = Array.create;

#endif // DEFINE_GLOBALS

#endif // __lang_Array__