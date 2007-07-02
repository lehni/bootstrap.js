#ifndef __browser_DomQuery__
#define __browser_DomQuery__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif

////////////////////////////////////////////////////////////////////////////////
// DomQuery

new function() {
	function hasTag(el, tag) {
		return tag == '*' || el.tagName && el.tagName.toLowerCase() == tag;
	}

	function getPseudo(pseudo, method) {
		var match = pseudo.match(/^([\w-]+)(?:\((.*)\))?$/);
		if (!match) throw 'Bad pseudo selector: ' + pseudo;
		var name = match[1].split('-')[0];
		var argument = match[2] || false;
		var handler = DomElement.pseudos[name];
		return {
			name: name,
			argument: handler && handler.parser
				? (handler.parser.apply ? handler.parser(argument) : handler.parser)
				: argument,
			handler: (handler.handler || handler)[method]
		};
	}

	function getAttribute(attribute) {
		var match = attribute.match(/^(\w+)(?:([!*^$~]?=)["']?([^"'\]]*)["']?)?$/);
		if (!match) throw 'Bad attribute selector: ' + attribute;
		return match;
	}

	function resolver(prefix) {
		return prefix == 'xhtml' ? 'http://www.w3.org/1999/xhtml' : false;
	}

	// method indices:
	var XPATH= 0, FILTER = 1;

	var methods = [ { // XPath: 
		getParam: function(items, separator, context, tag, id, className, attribute, pseudo, version) {
			var temp = context.namespaceURI ? 'xhtml:' : '';
			seperator = separator && (separator = DomElement.separators[separator]);
			temp += seperator ? separator[XPATH](tag) : tag;
			if (pseudo) {
				pseudo = getPseudo(pseudo, XPATH);
				var handler = pseudo.handler;
				if (handler) temp += handler(pseudo.argument);
				else temp += pseudo.argument != undefined
					? '[@' + pseudo.name + '="' + pseudo.argument + '"]'
					: '[@' + pseudo.name + ']';
			}
			if (id) temp += '[@id="' + id + '"]';
			if (className) temp += '[contains(concat(" ", @class, " "), " ' + className + ' ")]';
			if (attribute) {
				attribute = getAttribute(attribute);
				if (attribute[2] && attribute[3]) {
					var operator = DomElement.operators[attribute[2]];
					if (operator) temp += operator[XPATH](attribute[1], attribute[3]);
				} else {
					temp += '[@' + attribute[1] + ']';
				}
			}
			items.push(temp);
			return items;
		},

		getElements: function(items, elements, context) {
			var res = document.evaluate('.//' + items.join(''), context,
				resolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
			for (var i = 0, j = res.snapshotLength; i < j; i++)
				elements.push(res.snapshotItem(i));
		}
	}, { // Filter:
		getParam: function(items, separator, context, tag, id, className, attribute, pseudo, version) {
			if (separator && (separator = DomElement.separators[separator])) {
				items = separator[FILTER](items, tag);
				if (id) items = items.filter(function(el) {
					return el.id == id;
				});
			} else {
				if (id) {
					var el = document.getElementById(id);
					if (!el || context && !DomElement.isAncestor(el, context) || !hasTag(el, tag))
						return null;
					items = [el];
				} else {
					items = Array.create(context.getElementsByTagName(tag));
				}
			}
			if (className) items = items.filter(function(el) {
				return el.className && (' ' + el.className + ' ').indexOf(' ' + className + ' ') != -1;
			});
			if (attribute) attribute = getAttribute(attribute);
			if (pseudo) {
				pseudo = getPseudo(pseudo, FILTER);
				var handler = pseudo.handler;
				if (handler) {
					// Pass an empty array to the filter method, as a temporary
					// storage space. Used in nth's filter.
					items = items.filter(function(el) {
						return handler(el, pseudo.argument, version);
					});
				} else {
					attribute = [null, pseudo.name, pseudo.argument != undefined ? '=' : null, pseudo.argument];
				}
			}
			if (attribute) {
				var name = attribute[1], operator = DomElement.operators[attribute[2]], value = attribute[3];
				operator = operator && operator[FILTER];
				items = items.filter(function(el) {
					// TODO: Find a way to do this without passing through wrapper
					var att = DomElement.get(el).getProperty(name);
					return att && (!operator || operator(att, value));
				});
			}
			return items;
		},

		getElements: function(items, elements, context) {
			elements.append(items);
		}
	}];

	function following(one) {
		return [
			function(tag) {
				return '/following-sibling::' + tag + (one ? '[1]' : '');
			},

			function(items, tag) {
				return items.each(function(item) {
					var next = item.nextSibling;
					while (next) {
						if (hasTag(next, tag)) {
							this.push(next);
							if (one) break;
						}
						next = next.nextSibling;
					}
				}, []);
			}
		];
	}

	DomElement.separators = {
		'~': following(false),

		'+': following(true),

		'>': [
		 	function(tag) {
				return '/' + tag;
			},
			function(items, tag) {
				return items.each(function(item) {
					Base.each(item.childNodes, function(child) {
						if (hasTag(child, tag))
							this.push(child);
					}, this);
				}, []);
			}
		],

		' ': [
			function(tag) {
				return '//' + tag;
			},
			function(items, tag) {
				return items.each(function(item) {
					this.append(item.getElementsByTagName(tag));
				}, []);
			}
		]
	};

	DomElement.operators = {
		'=': [
			function(a, v) {
				return '[@' + a + '="' + v + '"]';
			},
			function(a, v) {
				return a == v;
			}
		],

		'*=': [
	 		function(a, v) {
				return '[contains(@' + a + ', "' + v + '")]';
			},
			function(a, v) {
				return a.contains(v);
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

		'~=': [
			function(a, v) {
				return '[contains(concat(" ", @' + a + ', " "), " ' + v + ' ")]';
			},
			function(a, v) {
				return a.contains(v, ' ');
			}
		]
	};

	var nth = [
		function(argument) {
			switch(argument.special) {
			case 'n': return '[count(preceding-sibling::*) mod ' + argument.a + ' = ' + argument.b + ']';
			case 'last': return '[count(following-sibling::*) = 0]';
			case 'only': return '[not(preceding-sibling::* or following-sibling::*)]';
			default: return '[count(preceding-sibling::*) = ' + argument.a + ']';
			}
		},

		function(el, argument, version) {
			var parent = el.parentNode, children = parent._children;
			if (!children || children.version != version) {
				if (!children) DomElement.collect(parent);
				children = parent._children = Array.filter(parent.childNodes, function(child) {
					return child.nodeName && child.nodeType == 1;
				});
				children.version = version;
			}
			var include = false;
			switch(argument.special) {
			case 'n': if (children.indexOf(el) % argument.a == argument.b) include = true; break;
			case 'last': if (children.last() == el) include = true; break;
			case 'only': if (children.length == 1) include = true; break;
			case 'index': if (children[argument.a] == el) include = true;
			}
			return include;
		}
	];

	DomElement.pseudos = {
		enabled: [
			function() {
				return '[not(@disabled)]';
			},
			function(el) {
				return !el.disabled;
			}
		],

		empty: [
		 	function() {
				return '[not(node())]';
			},
			function(el) {
				return Element.getText(el).length === 0;
			}
		],

		contains: [
			function(argument) {
				return '[contains(text(), "' + argument + '")]';
			},
			function(el, argument) {
				var nodes = el.childNodes;
				for (var i = 0; i < nodes.length; i++) {
					var child = nodes[i];
					if (child.nodeName && child.nodeType == 3 &&
						child.nodeValue.contains(argument)) return true;
				}
				return false;
			}
		],

		nth: {
			parser: function(argument) {
				var match = argument ? argument.match(/^([+-]?\d*)?([nodev]+)?([+-]?\d*)?$/) : [null, 1, 'n', 0];
				if (!match) throw 'Bad nth pseudo selector arguments: ' + argument;
				var i = parseInt(match[1]);
				var a = isNaN(i) ? 1 : i;
				var special = match[2] || false;
				var b = parseInt(match[3]) || 0;
				b = b - 1;
				while (b < 1) b += a;
				while (b >= a) b -= a;
				switch(special) {
				case 'n': return { a: a, b: b, special: 'n' };
				case 'odd': return { a: 2, b: 0, special: 'n' };
				case 'even': return { a: 2, b: 1, special: 'n' };
				case 'first': return { a: 0, special: 'index' };
				case 'last': return { special: 'last' };
				case 'only': return { special: 'only' };
				default: return { a: (a - 1), special: 'index' };
				}
			},
			handler: nth
		},

		even: {
			parser: { a: 2, b: 1, special: 'n' },
			handler: nth
		},

		odd: {
			parser: { a: 2, b: 0, special: 'n' },
			handler: nth
		},

		first: {
			parser: { a: 0, special: 'index' },
			handler: nth
		},

		last: {
			parser: { special: 'last' },
			handler: nth
		},

		only: {
			parser: { special: 'only' },
			handler: nth
		}
	};

	var version = 0;

	DomElement.inject({
		getElements: function(selectors, nowrap) {
			// Increase version number for keeping cached elements in sync.
			version++;
			var elements = nowrap ? [] : new this._elements();
			// Xpath does not properly match selected attributes in option elements
			// Force filter code when the selectors contain "option["
			selectors = typeof selectors == 'string'
				? selectors.split(',')
				: selectors.length != null ? selectors : [selectors];
			for (var i = 0; i < selectors.length; i++) {
				var selector = selectors[i], type = $typeof(selector);
				if (type == 'element') elements.push(selector);
				else {
					var method = methods[type == 'string' && /option\[/.test(selector) || !Browser.XPATH ? FILTER : XPATH];
					var items = [], separators = [];
					selector = selector.trim().replace(/\s*([+>~\s])[a-zA-Z#.*\s]/g, function(match) {
						if (match.charAt(2)) match = match.trim();
						separators.push(match.charAt(0));
						return '%' + match.charAt(1);
					}).split('%');
					for (var j = 0; j < selector.length; j++) {
						var match = selector[j].match(/^(\w*|\*)(?:#([\w-]+))?(?:\.([\w-]+))?(?:\[(.*)\])?(?::(.*))?$/);
						if (!match) throw 'Bad selector: ' + selector[j];
						var temp = method.getParam(items, separators[j - 1], this.$,
							match[1] || '*', match[2], match[3], match[4], match[5], version);
						if (!temp) break;
						items = temp;
					}
					method.getElements(items, elements, this.$);
				}
			}
			return elements;
		},

		getElement: function(selector) {
			var el, type = $typeof(selector);
			if (type == 'string') {
				if (selector.charAt(0) == '#')
					selector = selector.substring(1);
				// Try  fetching by id first, if no success, assume a real selector
				el = document.getElementById(selector);
			} else if (type == 'element') {
				el = DomElement.unwrap(selector);
			}
			if (!el) el = this.getElements(selector, true)[0];
			else if (!DomElement.isAncestor(el, this.$)) return null;
			return DomElement.get(el);
		},

		getParents: function(selector) {
			var parents = new this._elements();
			for (var el = this.$.parentNode; el; el = el.parentNode)
				parents.push(el);
			/*
			// TODO:
			return selector && selector != '*'
				? DomElement.filter(parents, selector, this)
				: parents;
			*/
			return parents;
		}
	});
}

#endif // __browser_DomQuery__
