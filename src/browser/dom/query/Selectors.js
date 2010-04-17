#ifndef __browser_dom_query_Selectors__
#define __browser_dom_query_Selectors__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif // HIDDEN

////////////////////////////////////////////////////////////////////////////////
// Selectors

DomElement.inject(new function() {
	// Method indices:
	var XPATH= 0, FILTER = 1;

	var methods = [{ // XPATH
		getParam: function(items, separator, context, params) {
			var str = context.namespaceURI ? 'xhtml:' + params.tag : params.tag;
			if (separator && (separator = DomElement.separators[separator]))
				str = separator[XPATH] + str;
			for (var i = params.pseudos.length; i--;) {
				var pseudo = params.pseudos[i];
				str += pseudo.handler[XPATH](pseudo.argument);
			}
			if (params.id) str += '[@id="' + params.id + '"]';
			for (var i = params.classes.length; i--;)
				str += '[contains(concat(" ", @class, " "), " ' + params.classes[i] + ' ")]';
			for (var i = params.attributes.length; i--;) {
				var attribute = params.attributes[i];
				var operator = DomElement.operators[attribute[1]];
				if (operator) str += operator[XPATH](attribute[0], attribute[2]);
				else str += '[@' + attribute[0] + ']';
			}
			items.push(str);
			return items;
		},

		getElements: function(items, elements, context) {
			function resolver(prefix) {
				return prefix == 'xhtml' ? 'http://www.w3.org/1999/xhtml' : false;
			}
			var res = (context.ownerDocument || context).evaluate('.//' + items.join(''), context,
				resolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
			for (var i = 0, l = res.snapshotLength; i < l; i++)
				elements.push(res.snapshotItem(i));
		}
	}, { // FILTER
		getParam: function(items, separator, context, params, data) {
			var found = [];
			var tag = params.tag;
			if (separator && (separator = DomElement.separators[separator])) {
				separator = separator[FILTER];
				var uniques = {};
				function add(item) {
					if (!item._unique)
						DomNode.unique(item);
					if (!uniques[item._unique] && match(item, params, data)) {
						uniques[item._unique] = true;
						found.push(item);
						return true;
					}
				}
				for (var i = 0, l = items.length; i < l; i++)
					separator(items[i], params, add);
				if (params.clearTag)
					params.tag = params.clearTag = null;
				return found;
			}
			if (params.id) {
				// First try getElementById. If that does not return the right
				// object, retrieve tags first and then filter by id.
				var el = (context.ownerDocument || context).getElementById(params.id);
				// Clear as it is already filtered by getElementById
				params.id = null;
				return el && DomElement.isAncestor(el, context)
					&& match(el, params, data) ? [el] : null;
			} else {
				if (!items.length) {
					items = context.getElementsByTagName(tag);
					// Clear as it is already filtered by getElementsByTagName
					params.tag = null;
				}
				for (var i = 0, l = items.length; i < l; i++)
					if (match(items[i], params, data))
						found.push(items[i]);
			}
			return found;
		},

		getElements: function(items, elements, context) {
			elements.append(items);
		}
	}];

	function parse(selector) {
		var params = { tag: '*', id: null, classes: [], attributes: [], pseudos: [] };
		selector.replace(/:([^:(]+)*(?:\((["']?)(.*?)\2\))?|\[(\w+)(?:([!*^$~|]?=)(["']?)(.*?)\6)?\]|\.[\w-]+|#[\w-]+|\w+|\*/g, function(part) {
			switch (part.charAt(0)) {
				case '.': params.classes.push(part.slice(1)); break;
				case '#': params.id = part.slice(1); break;
				case '[': params.attributes.push([arguments[4], arguments[5], arguments[7]]); break;
				case ':':
					var handler = DomElement.pseudos[arguments[1]];
					if (!handler) {
						params.attributes.push([arguments[1], arguments[3] ? '=' : '', arguments[3]]);
						break;
					}
					params.pseudos.push({
						name: arguments[1],
						argument: handler && handler.parser
							? (handler.parser.apply ? handler.parser(arguments[3]) : handler.parser)
							: arguments[3],
						handler: handler.handler || handler
					});
				break;
				default: params.tag = part;
			}
			return '';
		});
		return params;
	}

	function match(el, params, data) {
		if (params.id && params.id != el.id)
			return false;

		if (params.tag && params.tag != '*' && params.tag != (el.tagName || '').toLowerCase())
			return false;

		for (var i = params.classes.length; i--;)
			if (!el.className || !el.className.contains(params.classes[i], ' '))
				return false;

		var proto = DomElement.prototype;
		for (var i = params.attributes.length; i--;) {
			var attribute = params.attributes[i];
			// Use a hack to call DomElement.prototype.getProperty on
			// unwrapped elements very quickly: Set $ on
			// DomElement.prototype, then call getProperty on it.
			// This is much faster than the DomElement.getProperty generic.
			proto.$ = el; // Point to the native elment for the call
			var val = proto.getProperty(attribute[0]);
			if (!val) return false;
			var operator = DomElement.operators[attribute[1]];
			operator = operator && operator[FILTER];
			if (operator && (!val || !operator(val, attribute[2])))
				return false;
		}

		for (var i = params.pseudos.length; i--;) {
			var pseudo = params.pseudos[i];
			if (!pseudo.handler[FILTER](el, pseudo.argument, data))
				return false;
		}

		return true;
	}

	function filter(items, selector, context, elements, data) {
		// XPATH does not properly match selected attributes in option elements
		// Force filter code when the selectors contain "option["
		// Also, use FILTER when filtering a previously filled list of items,
		// as used by getParents()
		var method = methods[!Browser.XPATH || items.length ||
			typeof selector == 'string' && selector.contains('option[')
			? FILTER : XPATH];
		var separators = [];
		selector = selector.trim().replace(/\s*([+>~\s])[a-zA-Z#.*\s]/g, function(match) {
			if (match.charAt(2)) match = match.trim();
			separators.push(match.charAt(0));
			return ':)' + match.charAt(1);
		}).split(':)');
		for (var i = 0, l = selector.length; i < l; i++) {
			var params = parse(selector[i]);
			if (!params) return elements; // TODO: correct?
			var next = method.getParam(items, separators[i - 1], context, params, data);
			if (!next) break;
			items = next;
		}
		method.getElements(items, elements, context);
		return elements;
	}

	return {
		_BEANS

		getElements: function(selectors, nowrap) {
			var elements = nowrap ? [] : new this._collection();
			selectors = !selectors ? ['*'] : typeof selectors == 'string'
				? selectors.split(',')
				: selectors.length != null ? selectors : [selectors];
			for (var i = 0, l = selectors.length; i < l; i++) {
				var selector = selectors[i];
				if (Base.type(selector) == 'element') elements.push(selector);
				else filter([], selector, this.$, elements, {});
			}
			return elements;
		},

		getElement: function(selector) {
			var el, type = Base.type(selector), match;
			// Try  fetching by id first, if no success, assume a real selector.
			// Note that '#' is not needed, a string that could be an id (a-zA-Z_-)
			// is enough for trying getElementById first.
			// So $() can also work like Mootools' $()
			if (type == 'window') {
				el = selector;
			} else {
				if (type == 'string' && (match = selector.match(/^#?([\w-]+)$/)))
					el = this.getDocument().$.getElementById(match[1]);
				// TODO!
				else if (DomNode.isNode(type))
					el = DomElement.unwrap(selector);
				// If el was fetched by id above, but is not a child of this or is this,
				// use the real selector.
				if (el && el != this.$ && !DomElement.isAncestor(el, this.$))
					el = null;
				// TODO: Is there a way to only fetch the first in getElements,
				// with an optional third parameter?
				if (!el)
					el = this.getElements(selector, true)[0];
			}
			return DomNode.wrap(el);
		},

		hasElement: function(selector) {
			return !!this.getElement(selector);
		},

		match: function(selector) {
			return !selector || match(this.$, parse(selector), {});
		},

		filter: function(elements, selector) {
			return filter(elements, selector, this.$, new this._collection(), {});
		},

		statics: {
			match: function(el, selector) {
				return !selector || match(DomElement.unwrap(el), parse(selector), {});
			}
		}
	};
});

#endif // __browser_dom_query_Selectors__
