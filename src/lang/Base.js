#ifndef __lang_Base__
#define __lang_Base__

#include "Enumerable.js"

////////////////////////////////////////////////////////////////////////////////
// Base

Base.inject({
	_HIDE
	_generics: true,

#ifdef DEBUG
	debug: function() {
		return /^(string|number|function|regexp)$/.test(Base.type(this)) ? this
			: Base.each(this, function(val, key) { this.push(key + ': ' + val); }, []).join(', ');
		/*
		switch (Base.type(this)) {
		case 'string': case 'number': case 'regexp':
			return this;
		case 'function':
			return 'function ' + (this.name || '');
		}
		var buf = [];
		for (var key in this)
			if (Base.has(this, key))
				buf.push(key + ': ' + Base.debug(this[key]));
		return buf.join(', ');
		*/
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
	},

	toQueryString: function() {
		return Base.each(this, function(val, key) {
#ifdef BROWSER
			this.push(key + '=' + encodeURIComponent(val));
#else // !BROWSER
			this.push(key + '=' + escape(val));
#endif // !BROWSER
		}, []).join('&');
	}
});

#endif // __lang_Base__