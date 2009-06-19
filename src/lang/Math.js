#ifndef __lang_Math__
#define __lang_Math__

////////////////////////////////////////////////////////////////////////////////
// Math

/**
 * Returns a random integer number first <= x < second, if two arguments are
 * passed or 0 <= x < first, if there is donly one.
 */
Math.rand = function(first, second) {
	return second == undefined
		? Math.rand(0, first)
		: Math.floor(Math.random() * (max - min) + min);
}

#endif // __lang_Math__