#ifndef __browser_dom_query_Separators__
#define __browser_dom_query_Separators__

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
// Separators

DomElement.separators = {
	'~': [
		'/following-sibling::',

		function(item, params, add) {
			while (item = item.nextSibling)
				if (item.nodeType == 1 && add(item))
					break;
		}
	],

	'+': [
		'/following-sibling::*[1]/self::',

		function(item, params, add) {
			while (item = item.nextSibling) {
				if (item.nodeType == 1) {
					add(item);
					break;
				}
			}
		}
	],

	'>': [
	 	'/',

		function(item, params, add) {
			var children = item.childNodes;
			for (var i = 0, l = children.length; i < l; i++)
				if (children[i].nodeType == 1)
					add(children[i]);
		}
	],

	' ': [
		'//',

		function(item, params, add) {
			var children = item.getElementsByTagName(params.tag);
			params.clearTag = true;
			for (var i = 0, l = children.length; i < l; i++)
				add(children[i]);
		}
	]
};

#endif // __browser_dom_query_Separators__
