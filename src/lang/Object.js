#ifndef __lang_Object__
#define __lang_Object__

#include "Enumerable.js"

////////////////////////////////////////////////////////////////////////////////
// Object

// Do not use inject for the definition of $each and each yet, as it relies
// on them already being there:

Object.inject({
	/**
	 * Copied over from Enumerable.
	 */
	each: Enumerable.each,
	
	/**
	 * Creates a new object and copies over all name / value pairs from this
	 * associative array. Uses $each to filter out unwanted properties
	 */
	clone: function() {
		return this.each(function(val, i) {
			this[i] = val;
		}, {});
	}
}, true);

#endif // __lang_Object__