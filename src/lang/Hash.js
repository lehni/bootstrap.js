#ifndef __lang_Hash__
#define __lang_Hash__

#include "Enumerable.js"

////////////////////////////////////////////////////////////////////////////////
// Hash

/**
 * As Object only defines each and two other basic functions to avoid name
 * clashes in all other prototypes, define a second prototype called Hash,
 * which basically does the same but fully implements Enumberable.
 * Also note the difference to Prototype.js, where Hash does not iterate 
 * in the same way. Instead of creating a new key / value pair object for
 * each element and passing the numerical index of it in the iteration as a
 * second argument, use the key as the index, and the value as the first
 * element. This is much simpler and faster, and I have not yet found out the
 * advantage of how Prototype handles it. 
 */
Hash = Base.extend(Enumerable, {
	_HIDE
	_generics: true,

	/**
	 * Constructs a new Hash. The constructor takes a variable amount of
	 * argument objects of which the fields are all merged into the hash.
	 */
	initialize: function(arg) {
		// If the first argument is a string, assume pairs of key/value arguments,
		// to be set on the hash.
		if (typeof arg == 'string') {
			for (var i = 0, l = arguments.length; i < l; i += 2)
				this[arguments[i]] = arguments[i + 1];
		} else {
			// Use the faster append if there's only one parameter.
			this[arguments.length == 1 ? 'append' : 'merge'].apply(this, arguments);
		}
		// Explicitly return object as it is used in Hash.create's return statement
		return this;
	},

	each: function(iter, bind) {
		if (!bind) bind = this;
		iter = Base.iterator(iter);
		try {
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
		} catch (e) {
			if (e !== Base.stop) throw e;
		}
		return bind;
	},

	/**
	 * append is faster and more low level than merge, completely based on 
	 * for-in and Base.has, and not relying on any .each function, so can
	 * be used early in the bootstrapping process.
	 */
	append: function() {
		for (var i = 0, l = arguments.length; i < l; i++) {
			var obj = arguments[i];
			for (var key in obj)
				if (Base.has(obj, key))
					this[key] = obj[key];
		}
		return this;
	},

	/**
	 * Deep merges with the given enumerable object and returns the modifed hash.
	 * Recursively calls merge or clone on value pairs if they are dictionaries.
	 */
	merge: function() {
		// Allways use Base.each() as we don't know wether the passed object
		// really inherits from Base.
		// Do not rely on .each / .forEach, so merge can be used in low level
		// operations such as insertion of such functions as well. Just use
		// the Base.has generic to filter out parent values.
		return Array.each(arguments, function(obj) {
			Base.each(obj, function(val, key) {
				this[key] = Base.type(this[key]) == 'object'
					? Hash.prototype.merge.call(this[key], val)
					: Base.type(val) == 'object' ? Base.clone(val) : val;
			}, this);
		}, this);
	},

	/**
	 * Collects the keys of each element and returns them in an array.
	 */
	// TODO: Consider naming keys(), to go with Object.keys(), same for getValues / getSize
	getKeys: function() {
		return this.map(function(val, key) {
			return key;
		});
	},

	/**
	 * Does the same as toArray(), but renamed to go together with getKeys()
	 */
	getValues: Enumerable.toArray,

	getSize: function() {
		return this.each(function() {
			this.size++;
		}, { size: 0 }).size;
	},

	statics: {
		/**
		 * Converts the passed object to a hash. 
		 * Warning: Does not create a new instance if it is a hash already!
		 */
		create: function(obj) {
			return arguments.length == 1 && obj.constructor == Hash
				? obj : Hash.prototype.initialize.apply(new Hash(), arguments);
		}
	}
});

#ifdef DEFINE_GLOBALS

// Short-cut to Hash.create
$H = Hash.create;

#endif // DEFINE_GLOBALS

#endif // __lang_Hash__