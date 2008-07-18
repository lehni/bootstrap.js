#ifndef __lang_Math__
#define __lang_Math__

////////////////////////////////////////////////////////////////////////////////
// Math

/**
 * Returns a random integer number min <= x < max
 */
Math.rand = function(min, max) {
	return Math.floor(Math.random() * (max - min) + min);
}

#endif // __lang_Math__