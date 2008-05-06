#ifndef __lang_Math__
#define __lang_Math__

////////////////////////////////////////////////////////////////////////////////
// Math

/**
 * Returns a random integer number 0 <= x < value
 */
Math.rand = function(value) {
	return Math.floor(Math.random() * Math.abs(value)); 
}

#endif // __lang_Math__