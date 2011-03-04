//#ifndef __browser_dom_query_Operators__
//#define __browser_dom_query_Operators__

//#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 */
//#endif // HIDDEN

//#include "Selectors.js"

////////////////////////////////////////////////////////////////////////////////
// Operators

DomElement.operators = new function() {
	// Producer for the group of contains based operators: *=, |=, ~=. See bellow.
	function contains(sep) {
		return [
			// XPATH
			function(a, v) {
				return '[contains(' + (sep ? 'concat("' + sep + '", @' + a + ', "' + sep + '")' : '@' + a) + ', "' + sep + v + sep + '")]';
			},
			// FILTER
			function(a, v) {
				return a.contains(v, sep);
			}
		]
	}

	return {
		'=': [
			// XPATH
			function(a, v) {
				return '[@' + a + '="' + v + '"]';
			},
			// FILTER
			function(a, v) {
				return a == v;
			}
		],

		'^=': [
			// XPATH
	 		function(a, v) {
				return '[starts-with(@' + a + ', "' + v + '")]';
			},
			// FILTER
			function(a, v) {
				return a.substring(0, v.length) == v;
			}
		],

		'$=': [
			// XPATH
			function(a, v) {
				return '[substring(@' + a + ', string-length(@' + a + ') - ' + v.length + ' + 1) = "' + v + '"]';
			},
			// FILTER
			function(a, v) {
				return a.substring(a.length - v.length) == v;
			}
		],

		'!=': [
			// XPATH
			function(a, v) {
				return '[@' + a + '!="' + v + '"]';
			},
			// FILTER
			function(a, v) {
				return a != v;
			}
		],

		'*=': contains(''),

		'|=': contains('-'),

		'~=': contains(' ')
	};
};

//#endif // __browser_dom_query_Operators__
