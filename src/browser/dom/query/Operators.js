#ifndef __browser_dom_query_Operators__
#define __browser_dom_query_Operators__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif

#include "Selectors.js"

////////////////////////////////////////////////////////////////////////////////
// Operators

DomElement.operators = new function() {
	// Producer for the group of contains based operators: *=, |=, ~=. See bellow.
	function contains(sep) {
		return [
			function(a, v) {
				return '[contains(' + (sep ? 'concat("' + sep + '", @' + a + ', "' + sep + '")' : '@' + a) + ', "' + sep + v + sep + '")]';
			},
			function(a, v) {
				return a.contains(v, sep);
			}
		]
	}

	return {
		'=': [
			function(a, v) {
				return '[@' + a + '="' + v + '"]';
			},
			function(a, v) {
				return a == v;
			}
		],

		'^=': [
	 		function(a, v) {
				return '[starts-with(@' + a + ', "' + v + '")]';
			},
			function(a, v) {
				return a.substr(0, v.length) == v;
			}
		],

		'$=': [
			function(a, v) {
				return '[substring(@' + a + ', string-length(@' + a + ') - ' + v.length + ' + 1) = "' + v + '"]';
			},
			function(a, v) {
				return a.substr(a.length - v.length) == v;
			}
		],

		'!=': [
			function(a, v) {
				return '[@' + a + '!="' + v + '"]';
			},
			function(a, v) {
				return a != v;
			}
		],

		'*=': contains(''),

		'|=': contains('-'),

		'~=': contains(' ')
	};
};

#endif // __browser_dom_query_Operators__
