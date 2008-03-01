#ifndef __browser_dom_query_Pseudos__
#define __browser_dom_query_Pseudos__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif // HIDDEN

#include "Selectors.js"

////////////////////////////////////////////////////////////////////////////////
// Pseudos

DomElement.pseudos = new function() {
	// Handler for the nth-child group of pseudo operators.
	var nthChild = [
		// XPATH
		function(argument) {
			switch (argument.special) {
				case 'n': return '[count(preceding-sibling::*) mod ' + argument.a + ' = ' + argument.b + ']';
				case 'first': return '[count(preceding-sibling::*) = 0]';
				case 'last': return '[count(following-sibling::*) = 0]';
				case 'only': return '[not(preceding-sibling::* or following-sibling::*)]';
				case 'index': return '[count(preceding-sibling::*) = ' + argument.a + ']';
			}
		},
		// FILTER
		function(el, argument, data) {
			var count = 0;
			switch (argument.special) {
				case 'n':
					data.indices = data.indices || {};
					if (!data.indices[el._unique]) {
						var children = el.parentNode.childNodes;
						for (var i = 0, l = children.length; i < l; i++) {
							var child = children[i];
							if (child.nodeType == 1) {
								if (!child._unique)
									DomElement.unique(child);
								data.indices[child._unique] = count++;
							}
						}
					}
					return data.indices[el._unique] % argument.a == argument.b;
				case 'first':
					while (el = el.previousSibling)
						if (el.nodeType == 1)
							return false;
					return true;
				case 'last':
					while (el = el.nextSibling)
						if (el.nodeType == 1)
							return false;
					return true;
				case 'only':
					var prev = el;
					while(prev = prev.previousSibling)
						if (prev.nodeType == 1)
							return false;
					var next = el;
					while (next = next.nextSibling)
						if (next.nodeType == 1)
							return false;
					return true;
				case 'index':
					while (el = el.previousSibling)
						if (el.nodeType == 1 && ++count > argument.a)
							return false;
					return true;
			}
			return false;
		}
	];

	// Producer for both case-sensitive and caseless versions of the contains 
	// pseudo operator.
	function contains(caseless) {
		// abc for lowercase translation.
		var abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		return [
			// XPATH
			function(argument) {
				return '[contains(' + (caseless ? 'translate(text(), "' + abc
					+ '", "' + abc.toLowerCase() + '")' : 'text()') + ', "'
					+ (caseless && argument ? argument.toLowerCase() : argument) + '")]';
			},
			// FILTER
			function(el, argument) {
				if (caseless && argument) argument = argument.toLowerCase();
				var nodes = el.childNodes;
				for (var i = nodes.length - 1; i >= 0; i--) {
					var child = nodes[i];
					if (child.nodeName && child.nodeType == 3 &&
						(caseless ? child.nodeValue.toLowerCase() : child.nodeValue).contains(argument))
							return true;
				}
				return false;
			}
		];
	}

	return {
		'nth-child': {
			parser: function(argument) {
				var match = argument ? argument.match(/^([+-]?\d*)?([devon]+)?([+-]?\d*)?$/) : [null, 1, 'n', 0];
				if (!match) return null;
				var i = parseInt(match[1]);
				var a = isNaN(i) ? 1 : i;
				var special = match[2];
				var b = (parseInt(match[3]) || 0) - 1;
				while (b < 1) b += a;
				while (b >= a) b -= a;
				switch (special) {
					case 'n': return { a: a, b: b, special: 'n' };
					case 'odd': return { a: 2, b: 0, special: 'n' };
					case 'even': return { a: 2, b: 1, special: 'n' };
					case 'first': return { special: 'first' };
					case 'last': return { special: 'last' };
					case 'only': return { special: 'only' };
					default: return { a: a - 1, special: 'index' };
				}
			},
			handler: nthChild
		},

		// Short-cut to nth-child(even) / nth-child(2n)
		'even': {
			parser: { a: 2, b: 1, special: 'n' },
			handler: nthChild
		},

		// Short-cut to nth-child(odd) / nth-child(2n+1)
		'odd': {
			parser: { a: 2, b: 0, special: 'n' },
			handler: nthChild
		},

		'first-child': {
			parser: { special: 'first' },
			handler: nthChild
		},

		'last-child': {
			parser: { special: 'last' },
			handler: nthChild
		},

		'only-child': {
			parser: { special: 'only' },
			handler: nthChild
		},

		'enabled': [
			// XPATH
			function() {
				return '[not(@disabled)]';
			},
			// FILTER
			function(el) {
				return !el.disabled;
			}
		],

		'empty': [
			// XPATH
		 	function() {
				return '[not(node())]';
			},
			// FILTER
			function(el) {
				return !(el.innerText || el.textContent || '').length;
			}
		],

		'contains': contains(false),

		// Extension of contains for case insensitive compare. This is very
		// helpfull for on-site searches.
		'contains-caseless': contains(true)
	};
};

#endif // __browser_dom_query_Pseudos__
