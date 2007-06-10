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
Hash = Base.extend(Enumerable).inject({
	HIDE
	_type: 'hash',
	/**
	 * Constructs a new Hash. The constructor takes a variable amount of
	 * argument objects of which the fields are all merged into the hash.
	 */
	initialize: function() {
		// Explicitly return object as it is used in Hash.create's return statement
		return EACH(arguments, function(obj) {
			this.merge(obj);
		}, this);
	},

	/**
	 * Clones the hash.
	 */
	clone: function() {
		return new Hash(this);
	},

	/**
	 * Deep merges with the given enumerable object and returns the modifed hash.
	 * Recursively calls merge on value pairs if they are dictionaries.
	 */
	merge: function(obj) {
		// Allways use $each() as we don't know wether the passed object
		// really inherits from Base.
		return obj ? $each(obj, function(val, key) {
			this[key] = /^(object|hash)$/.test($typeof(this[key]))
					? Hash.prototype.merge.call(this[key], val) : val;
		}, this) : this;
	},

	/**
	 * Collects the keys of each element and returns them in an array.
	 */
	keys: function() {
		return this.map(function(val, key) {
			return key;
		});
	},

	/**
	 * Does the same as toArray(), but renamed to go together with keys()
	 */
	values: Enumerable.toArray,

	statics: {
		/**
		 * Converts the passed object to a hash. 
		 * Warning: Does not create a new instance if it is a hash already!
		 */
		create: function(obj) {
			return arguments.length == 1 && $typeof(obj) == 'hash' ? obj
				: Hash.prototype.initialize.apply(new Hash(), arguments);
		}
	}
});

// Short-cut to Hash.create
$H = Hash.create;

#endif // __lang_Hash__