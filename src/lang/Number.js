#ifndef __lang_Number__
#define __lang_Number__

////////////////////////////////////////////////////////////////////////////////
// Number

#include "String.js"

// an example how other prototypes could be improved.
Number.inject({
	// tell $typeof that number objects are numbers too.
	_type: 'number',

	/**
	 * Executes the passed iterator as many times as specified by the
	 * numerical value.
	 */
	times: function(iter) {
		for (var i = 0; i < this; i++) iter();
		return this;
	},

	toInt: String.prototype.toInt,

	toFloat: String.prototype.toFloat
});

#endif // __lang_Number__