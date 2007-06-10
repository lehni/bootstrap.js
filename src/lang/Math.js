#ifndef __lang_Math__
#define __lang_Math__

////////////////////////////////////////////////////////////////////////////////
// Math

Math.inject({
	rand: function(min, max) {
		return Math.floor(Math.random() * (max - min + 1) + min);
	}
});

#endif // __lang_Math__