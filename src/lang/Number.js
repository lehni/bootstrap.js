#ifndef __lang_Number__
#define __lang_Number__

////////////////////////////////////////////////////////////////////////////////
// Number

#include "String.js"

Number.inject({
	// tell $typeof that number objects are numbers too.
	_type: 'number',
	toInt: String.prototype.toInt,
	toFloat: String.prototype.toFloat
});

#endif // __lang_Number__