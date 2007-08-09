#ifndef __lang_Base__
#define __lang_Base__

#include "Enumerable.js"

////////////////////////////////////////////////////////////////////////////////
// Base

Base.inject({
	HIDE
	_generics: true,

	/**
	 * Copied over from Enumerable.
	 */
	each: Enumerable.each,

#ifdef DEBUG
	debug: function() {
		return /^(string|number|function|regexp)$/.test(Base.type(this)) ? this
			: this.each(function(val, key) { this.push(key + ': ' + val); }, []).join(', ');
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

	statics: {
#ifndef EXTEND_OBJECT
		inject: function() {
			// Inject anything added to Base into the standard types as well.
			// Do not inject into Function, as this would override inject / extend there!
			var args = arguments;
			Base.each([Array, Number, RegExp, String], function(ctor) {
				ctor.inject.apply(ctor, args);
			});
			return this.base.apply(this, args);
		},

		extend: function() {
			var ret = this.base();
			// Set proper versions of inject and extend on constructors
			// extending Base, not the overriden ones in Base...
			ret.extend = Function.extend;
			ret.inject = Function.inject;
			ret.inject.apply(ret, arguments);
			return ret;
		},

#endif // !EXTEND_OBJECT
		check: function(obj) {
			return !!(obj || obj === 0);
		},

		type: function(obj) {
#ifdef BROWSER
			// Handle elements, as needed by DomElement.js
			return (obj || obj === 0) && ((obj._type || obj.nodeName && obj.nodeType == 1 && 'element') || typeof obj) || null;
#else // !BROWSER
			return (obj || obj === 0) && (obj._type || typeof obj) || null;
#endif // !BROWSER
		}
	}
#ifdef EXTEND_OBJECT
});
#else // !EXTEND_OBJECT
// Reinject things from Base.prototype now, so they are added to the other types
// as well. This works since EXTEND_OBJECT cannot be combined with DONT_ENUM.
}, Base.prototype);
#endif // !EXTEND_OBJECT

#ifdef DEFINE_GLOBALS

$each = Base.each;
$stop = $break = Base.stop;
$check = Base.check;
$type = Base.type;

#endif // DEFINE_GLOBALS

#endif // __lang_Base__