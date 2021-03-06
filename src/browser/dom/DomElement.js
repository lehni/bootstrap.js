//#ifndef __browser_dom_DomElement__
//#define __browser_dom_DomElement__

//#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 */
//#endif // HIDDEN

////////////////////////////////////////////////////////////////////////////////
// DomElements

var DomElements = DomNodes.extend();

////////////////////////////////////////////////////////////////////////////////
// DomElement

var DomElement = DomNode.extend({
	BEANS_TRUE
	// Tells Base.type the type to return when encountering an element.
	_type: 'element',
	_collection: DomElements,

	statics: {
		/**
		 * Returns the first element matching the given selector, within root
		 * or Browser.document, if root is not specified.
		 */
		get: function(selector, root) {
			// Do not use this for DomElement since $ is a link to DomElement.get
			return (root && DomNode.wrap(root) || Browser.document).getElement(selector);
		},

		/**
		 * Returns all elements matching the given selector, within root
		 * or Browser.document, if root is not specified.
		 */
		getAll: function(selector, root) {
			// Do not use this for DomElement since $$ is a link to DomElement.getAll
			return (root && DomNode.wrap(root) || Browser.document).getElements(selector);
		},

		/**
		 * This is only a helper method that's used both in DomDocument and DomElement.
		 * It does not fully set props, only the values needed for a IE workaround.
		 * It also returns an unwrapped object, that needs to further initalization
		 * and setting of props.
		 * This is needed to avoid production of two objects to match the proper
		 * prototype when using new HtmlElement(name, props).
		 */
		create: function(tag, props, doc) {
			if (Browser.TRIDENT && Browser.VERSION < 8 && props) {
				// Fix for readonly name and type properties in IE < 8
				['name', 'type', 'checked'].each(function(key) {
					if (props[key]) {
						tag += ' ' + key + '="' + props[key] + '"';
						if (key != 'checked')
							delete props[key];
					}
				});
				tag = '<' + tag + '>';
			}
			return (DomElement.unwrap(doc) || document).createElement(tag);
		},

		isAncestor: function(el, parent) {
			// Handle el.ownerDocumet == parent specially for efficiency and
			// also since documents don't define neither contains nor
			// compareDocumentPosition
			return !el ? false : el.ownerDocument == parent ? true
				: Browser.WEBKIT && Browser.VERSION < 420
					? Array.contains(parent.getElementsByTagName(el.tagName), el)
					: parent.contains
						? parent != el && parent.contains(el)
						: !!(parent.compareDocumentPosition(el) & 16)
		}
	}
});

DomElement.inject(new function() {
	// A helper for walking the DOM, skipping text nodes
	function walk(el, walk, start, match, all) {
		var elements = all && new el._collection();
		el = el.$[start || walk];
		while (el) {
			if (el.nodeType == 1 && (!match || DomElement.match(el, match))) {
				if (!all) return DomNode.wrap(el);
				elements.push(el);
			}
			el = el[walk];
		}
		return elements;
	}

	return {
		BEANS_TRUE
		_properties: ['id'],

		getTag: function() {
			return (this.$.tagName || '').toLowerCase();
		},

		getPrevious: function(match) {
			return walk(this, 'previousSibling', null, match);
		},

		getAllPrevious: function(match) {
			return walk(this, 'previousSibling', null, match, true);
		},

		getNext: function(match) {
			return walk(this, 'nextSibling', null, match);
		},

		getAllNext: function(match) {
			return walk(this, 'nextSibling', null, match, true);
		},

		getFirst: function(match) {
			return walk(this, 'nextSibling', 'firstChild', match);
		},

		getLast: function(match) {
			return walk(this, 'previousSibling', 'lastChild', match);
		},

		hasChild: function(match) {
			return DomNode.isNode(match)
				? DomElement.isAncestor(DomElement.unwrap(match), this.$)
				: !!this.getFirst(match);
		},

		getParent: function(match) {
			return walk(this, 'parentNode', null, match);
		},

		getParents: function(match) {
			return walk(this, 'parentNode', null, match, true);
		},

		hasParent: function(match) {
			return DomNode.isNode(match)
				? DomElement.isAncestor(this.$, DomElement.unwrap(match))
				: !!this.getParent(match);
		},

		// Returns all the Element's children excluding text nodes
		getChildren: function(match) {
			return walk(this, 'nextSibling', 'firstChild', match, true);
		},

		hasChildren: function(match) {
			return !!this.getChildren(match).length;
		},

		toString: function() {
			return (this.$.tagName || this._type).toLowerCase() +
				(this.$.id ? '#' + this.$.id : '');
		},

		toNode: function() {
			return this;
		}
	};
});

//#ifdef DEFINE_GLOBALS

var $ = DomElement.get,
	$$ = DomElement.getAll;

//#endif // DEFINE_GLOBALS

//#endif // __browser_dom_DomElement__
