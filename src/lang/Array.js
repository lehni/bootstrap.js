#ifndef __lang_Array__
#define __lang_Array__

#include "Enumerable.js"
#include "Hash.js"

////////////////////////////////////////////////////////////////////////////////
// Array

#ifdef ECMASCRIPT_5

Array.inject(Enumerable, {
	generics: true,
	// tell Base.type what to return for arrays.
	_type: 'array',

#else // !ECMASCRIPT_5

Array.inject({
	generics: true,
	preserve: true,
	// tell Base.type what to return for arrays.
	_type: 'array',

	// Define standard methods that might not be present and only get injected
	// if they don't exist because of preserve: true
	forEach: function(iter, bind) {
		for (var i = 0, l = this.length; i < l; i++)
			iter.call(bind, this[i], i, this);
	},

	indexOf: function(obj, i) {
		i = i || 0;
		if (i < 0) i = Math.max(0, this.length + i);
		for (var l = this.length; i < l; i++)
			if (this[i] == obj) return i;
		return -1;
	},

	lastIndexOf: function(obj, i) {
		i = i != null ? i : this.length - 1;
		if (i < 0) i = Math.max(0, this.length + i);
		for (; i >= 0; i--)
			if (this[i] == obj) return i;
		return -1;
	},

	filter: function(iter, bind) {
		var res = [];
		for (var i = 0, l = this.length; i < l; i++) {
			var val = this[i];
			if (iter.call(bind, val, i, this))
				res[res.length] = val;
		}
		return res;
	},

	map: function(iter, bind) {
		var res = new Array(this.length);
		for (var i = 0, l = this.length; i < l; i++)
			res[i] = iter.call(bind, this[i], i, this);
		return res;
	},

	every: function(iter, bind) {
		for (var i = 0, l = this.length; i < l; i++)
			if (!iter.call(bind, this[i], i, this))
				return false;
		return true;
	},

	some: function(iter, bind) {
		for (var i = 0, l = this.length; i < l; i++)
			if (iter.call(bind, this[i], i, this))
				return true;
		return false;
	},

	reduce: function(fn, value) {
		var i = 0;
		if (arguments.length < 2 && this.length) value = this[i++];
		for (var l = this.length; i < l; i++)
			value = fn.call(null, value, this[i], i, this);
		return value;
	}
}, Enumerable, {
	BEANS_TRUE
	generics: true,

#endif // !ECMASCRIPT_5

	each: function(iter, bind) {
		try {
			Array.prototype.forEach.call(this, Base.iterator(iter), bind = bind || this);
		} catch (e) {
			if (e !== Base.stop) throw e;
		}
		return bind;
	},

	collect: function(iter, bind) {
		var res = [];
		for (var i = 0, l = this.length; i < l; i++) {
		 	var val = iter.call(bind, this[i], i, this);
			if (val != null)
				res[res.length] = val;
		}
		return res;
	},

	findEntry: function(iter, bind) {
		// Use the faster indexOf in case we're not using iterator functions.
		if (typeof iter != 'function') {
			var i = this.indexOf(iter);
			// Return the same result as if Enumerable.findEntry was used
			// and the iter object was converter to an iterator.
			return i == -1 ? null : { key: i, value: iter, result: iter };
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

	contains: function(obj) {
		return this.indexOf(obj) != -1;
	},

	remove: function(iter, bind) {
		var entry = this.findEntry(iter, bind);
		if (entry) {
			this.splice(entry.key, 1);
			return entry.value;
		}
	},

	/**
	 * Overrides the definition in Enumerable.toArray with a more efficient
	 * version.
	 */
	toArray: function() {
#ifdef BROWSER
		var res = this.concat([]);
		// Fix Opera bug where arguments are arrays but do not concatenate
		// correctly (a new array is returned with [0] == this).
		return res[0] == this ? Enumerable.toArray.call(this) : res;
#else // !BROWSER
		return this.concat([]);
#endif // !BROWSER
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
		// this.length is explicitely altered, so non-array sub-prototypes
		// can use it too.
		for (var i = 0, l = items.length; i < l; i++)
			this[this.length++] = items[i];
		return this;
	},

	/**
	 * Removes all objects contained in items.
	 */
	subtract: function(items) {
		for (var i = 0, l = items.length; i < l; i++)
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
	 * Creates a hash object containing the array's values associated to the
	 * given keys as defined by obj.
	 * This is based on mootools' associate, but extended by the possibility
	 * to not pass an obj, or pass a function:
	 * - If obj is an array, its values are the new keys.
	 * - If obj is a hash object, mootools behavior is assumed.
	 * - If obj is not defined, it is set to the array itself, resulting in
	 *   a hash with key and value set to the same (the initial array entry).
	 * - If obj is a function, it's passed to this.map(), and the resulting
	 *   array is used for the key values.
	 */
	associate: function(obj) {
		if (!obj)
			obj = this;
		else if (typeof obj == 'function')
			obj = this.map(obj);
		if (obj.length != null) {
			var that = this;
			return Base.each(obj, function(name, index) {
				this[name] = that[index];
				if (index == that.length)
					throw Base.stop;
			}, {});
		} else {
			// Produce a new bare object since we're deleting from it.
			obj = Hash.append({}, obj);
			// Use Base.each since this is also used for generics
			return Array.each(this, function(val) {
				var type = Base.type(val);
				// Use Base.each since it's a bare object for speed reasons
				// on the browser.
				Base.each(obj, function(hint, name) {
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
		return Array.each(this, function(val) {
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
		while (i--) res.swap(i, Math.rand(i + 1));
		return res;
	},

	pick: function() {
		return this[Math.rand(this.length)];
	},

	/**
	 * Returns the first element of the array.
	 */
	getFirst: function() {
		return this[0];
	},

	/**
	 * Returns the last element of the array.
	 */
	getLast: function() {
		return this[this.length - 1];
	}
});

Array.inject(new function() {
	var proto = Array.prototype;

	// Fields that are hidden in Array.prototype are explicitely copied over,
	// so that they can be inherited in extend() below, and generics are created
	// for them too.
	var fields = ['push','pop','shift','unshift','sort','reverse','join','slice','splice','forEach',
		'indexOf','lastIndexOf','filter','map','every','some','reduce','concat'].each(function(name) {
		this[name] = proto[name];
	}, { generics: true, preserve: true });

	// Make sure there are generics for all of them
	Array.inject(fields);

	// Now add the fields to be injected into sub-prototypes from Array.
	// See Array.extend for more explanation.
	Hash.append(fields, proto, {
		/**
		 * Clears the array.
		 * For non-array sub-prototypes, setting this.length = 0 does not clear
		 * the array. Exlicit delete is needed. For sub-prototypes.
		 */
		clear: function() {
			for (var i = 0, l = this.length; i < l; i++)
				delete this[i];
			this.length = 0;
		},

#ifdef BROWSER
		// Safari breaks native concat on sub classes of arrays. Simulate it here.
		concat: function(list) {
			// TODO: Test if newer versions are find with this.
			return Browser.WEBKIT
				? new Array(this.length + list.length).append(this).append(list)
				: Array.concat(this, list);
		},
#endif // BROWSER

		// The native toString does not work for classes inheriting from Array.
		// but luckily join does the same and works.
		toString: proto.join,

		// length is set so instances of array have it set to 0 to begin with.
		// (any length modifying operation on them like #push will then
		// define / modify the length field in the insance).
		length: 0
	});

	return {
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
					for (var i = 0, l = list.length; i < l; i++)
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
				var ret = Base.extend(fields, src);
				// The subclass can use the normal extend again:
				ret.extend = Function.extend;
				return ret;
			}
		}
	};
});

#ifdef DEFINE_GLOBALS

// Short-cut to Array.create
$A = Array.create;

#endif // DEFINE_GLOBALS

#endif // __lang_Array__