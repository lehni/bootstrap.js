#ifndef __lang_Number__
#define __lang_Number__

////////////////////////////////////////////////////////////////////////////////
// Number

#include "String.js"

Number.inject({
	// tell Base.type that number objects are numbers too.
	_type: 'number',

	toInt: String.prototype.toInt,

	toFloat: String.prototype.toFloat,

	times: function(func, bind) {
		for (var i = 0; i < this; ++i)
			func.call(bind, i);
		return bind || this;
	},

	toPaddedString: function(length, base, prefix) {
		var str = this.toString(base || 10);
		return (prefix || '0').times(length - str.length) + str;
	}
});

#endif // __lang_Number__