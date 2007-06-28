#ifndef __lang_Base__
#define __lang_Base__

#include "Enumerable.js"

////////////////////////////////////////////////////////////////////////////////
// Base

Base.inject({
	HIDE
	_generics: true,

	/**
	 * Copied over from Enumerable.
	 */
	each: Enumerable.each,

#ifdef DEBUG
	debug: function() {
		return /^(string|number|function|regexp)$/.test($typeof(this)) ? this
			: this.each(function(val, key) { this.push(key + ': ' + val); }, []).join(', ');
	},
#endif !DEBUG

	/**
	 * Creates a new object of the same type and copies over all
	 * name / value pairs from this object.
	 */
	clone: function() {
		return Base.each(this, function(val, i) {
			this[i] = val;
		}, new this.constructor());
	}
});

$each = Base.each;

#endif // __lang_Base__