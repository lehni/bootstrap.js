#ifndef __lang_String__
#define __lang_String__

#include "Number.js"
#include "Array.js"

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

	toInt: Number.prototype.toInt,

	toFloat: Number.prototype.toFloat,

	camelize: function(separator) {
		return this.replace(separator ? new RegExp('[' + separator + '](\\w)', 'g') : /-(\w)/g, function(all, chr) {
			return chr.toUpperCase();
		});
	},

	uncamelize: function(separator) {
		separator = separator || ' ';
		return this.replace(/[a-z][A-Z0-9]|[0-9][a-zA-Z]|[A-Z]{2}[a-z]/g, function(match) {
			return match.charAt(0) + separator + match.substring(1);
		});
	},

	hyphenate: function(separator) {
		return this.uncamelize(separator || '-').toLowerCase();
	},

	capitalize: function() {
		return this.replace(/\b[a-z]/g, function(match) {
			return match.toUpperCase();
		});
	},

	// TODO: Is this a good name? Does it need to be improved? (lighter.js relies on it).
	escapeRegExp: function() {
		return this.replace(/([-.*+?^${}()|[\]\/\\])/g, '\\$1');
	},

	/**
	 * Trims away characters matching a given regular expression at the beginning
	 * and end of the strnig. If no expression is given, \s is used to match white
	 * space.
	 */
	trim: function(exp) {
		exp = exp ? '[' + exp + ']' : '\\s';
		return this.replace(new RegExp('^' + exp + '+|' + exp + '+$', 'g'), '');
	},

	clean: function() {
		return this.replace(/\s{2,}/g, ' ').trim();
	},

	contains: function(string, sep) {
		return (sep ? (sep + this + sep).indexOf(sep + string + sep) : this.indexOf(string)) != -1;
	},

	times: function(count) {
		// Nice trick from Prototype:
		return count < 1 ? '' : new Array(count + 1).join(this);
	},

	isHtml: function() {
		// From jQuery:
		return /^[^<]*(<(.|\s)+>)[^>]*$/.test(this);
	}
});

#endif // __lang_String__