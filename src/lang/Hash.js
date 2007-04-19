#ifndef __lang_Hash__
#define __lang_Hash__

#include "Enumerable.js"

////////////////////////////////////////////////////////////////////////////////
// Hash

/**
 * Converts the passed object to a hash. 
 * Warning: Does not create a new instance if it is a hash already!
 */
function $H(obj) {
	return $typeof(obj) == 'hash' ? obj : new Hash(obj);
}

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
Hash = Object.extend({
	_type: "hash",

	/**
	 * Constructs a new Hash.
	 */
	$constructor: function(obj) {
		if (obj) this.merge(obj);
	},

	/**
	 * Clones the hash.
	 */
	clone: function() {
		return new Hash(this);
	},

	/**
	 * Merges with the given enumerable object and returns the modifed hash.
	 * Calls merge on value pairs if they are dictionaries.
	 */
	merge: function(obj) {
		return obj.each(function(val, i) {
			this[i] = $typeof(this[i]) != 'object' ? val : arguments.callee.call(this[i], val);
		}, this);
	},

	/**
	 * Collects the keys of each element and returns them in an array.
	 */
	keys: function() {
		return this.map(function(val, i) {
			return i;
		});
	},

	/**
	 * Does the same as toArray(), but renamed to go together with keys()
	 */
	values: Enumerable.toArray
}, true);

// inject Enumerable into Hash.
Hash.inject(Enumerable, true);

#endif // __lang_Hash__