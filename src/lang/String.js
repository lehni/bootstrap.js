#ifndef __lang_String__
#define __lang_String__

////////////////////////////////////////////////////////////////////////////////
// String

String.inject({
	_type: 'string',

	test: function(exp, param) {
		return new RegExp(exp, param || '').test(this);
	},

	/**
	 * Splits the string into an array of words. This can also be used on any
	 * String through $A as defined in Array.js, to work similarly to $w in Ruby
	 */
	toArray: function() {
		return this ? this.split(/\s+/) : [];
	},

	toInt: function() {
		return parseInt(this);
	},

	toFloat: function() {
		return parseFloat(this);
	},

	camelize: function(separator) {
		return this.replace(new RegExp(separator || '-', 'g'), function(match) {
			return match.charAt(1).toUpperCase();
		});
	},

	uncamelize: function(separator) {
		separator = separator || '-';
		return this.replace(/[a-zA-Z][A-Z0-9]|[0-9][a-zA-Z]/g, function(match) {
			return match.charAt(0) + separator + match.charAt(1);
		});
	},

	hyphenate: function() {
		return this.uncamelize().toLowerCase();
	},

	capitalize: function() {
#ifdef BROWSER_LEGACY
		// MACIE does not seem to know \b in Regexps
		return (" " + this).replace(/\s[a-z]/g, function(match) {
			return match.toUpperCase();
		}).substring(1);
#else // !BROWSER_LEGACY
		return this.replace(/\b[a-z]/g, function(match) {
			return match.toUpperCase();
		});
#endif // !BROWSER_LEGACY
	},

	trim: function() {
		return this.replace(/^\s+|\s+$/g, '');
	},

	clean: function() {
		return this.replace(/\s{2,}/g, ' ').trim();
	}
});

#ifdef BROWSER_LEGACY

////////////////////////////////////////////////////////////////////////////////
// String Legacy

// String replace with a function as a second argument does not work on quite
// a few browsers. Fix it here:

if ('aa'.replace(/\w/g, function() { return arguments[1] }) !== '01') {
	String.inject({
		replace: function(search, replace) {
			// If no function is specified, use the internal implementation
			if (typeof replace != 'function')
				return this.base(search, replace);
			var parts = [], pos = 0, a;
			while (a = search.exec(this)) {
			    a.push(a.index, a.input);
			    parts.push(this.substring(pos, a.index), replace.apply(null, a));
			    pos = a.index + a[0].length;
			    if (!search.global) break;
			}
			if (!parts.length) return this;
			parts.push(this.substring(pos));
			return parts.join('');
	    }
	});
}

#endif // BROWSER_LEGACY

#endif // __lang_String__