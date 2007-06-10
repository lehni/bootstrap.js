#ifndef __lang_Math__
#define __lang_Math__

////////////////////////////////////////////////////////////////////////////////
// Math

Math.rand = function(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

#endif // __lang_Math__