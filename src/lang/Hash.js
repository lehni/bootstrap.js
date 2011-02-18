//#ifndef __lang_Hash__
//#define __lang_Hash__

//#include "Enumerable.js"

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
	generics: true,

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
			this.append.apply(this, arguments);
		}
		// Explicitly return object as it is used in Hash.create's return statement
		return this;
	},

	each: function(iter, bind) {
		// Do not use Object.keys for iteration as iterators might modify
		// the object we're iterating over, making the hasOwnProperty still
		// necessary.
//#ifdef PROPERTY_DEFINITION
		// If PROPERTY_DEFINITION is used, we can fully rely on hasOwnProperty,
		// as even for FIX_PROTO, define(this, '__proto__', {}) is used.
		var bind = bind || this, iter = Base.iterator(iter);
		try {
			for (var i in this)
				if (this.hasOwnProperty(i))
					iter.call(bind, this[i], i, this);
//#else // !PROPERTY_DEFINITION
		// Rely on Base.has instead of hasOwnProperty directly.
		var bind = bind || this, iter = Base.iterator(iter), has = Base.has;
		try {
			for (var i in this)
				if (has(this, i))
					iter.call(bind, this[i], i, this);
//#endif // !PROPERTY_DEFINITION
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
	 * Returns the keys of all elements in an array.
	 */
	getKeys: function() {
		return Hash.getKeys(this);
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
		},

		/**
		 * Returns the keys of all elements in an array.
		 * Uses the native Object.keys if available.
		 */
		getKeys: Object.keys || function(obj) {
			return Hash.map(function(val, key) {
				return key;
			});
		}
	}
});

//#ifdef DEFINE_GLOBALS

// Short-cut to Hash.create
$H = Hash.create;

//#endif // DEFINE_GLOBALS

//#endif // __lang_Hash__