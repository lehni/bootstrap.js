#ifndef __browser_DomElement__
#define __browser_DomElement__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif

////////////////////////////////////////////////////////////////////////////////
// DomElements

/**
 * DomElements extends inject so that each of the functions
 * defined bellow are executed on the whole set of elements, and the
 * returned values are collected in an array and converted to a DomElements
 * array again, if it contains only html elements.
 */
DomElements = Array.extend({
	initialize: function(els) {
		// Instances of DomElements are not real arrays, but they inherit from
		// Array. Setting length to 0 is all that's needed to make all the
		// native array functions works. Modifying length later will not clear
		// the fields from the array though.
		this.length = 0;
		// Do not use els.push do detect arrays, as we're passing pseudo arrays
		// here too (e.g. childNodes). But Option defines .length too, so rule
		// that out by checking nodeType as well.
		this.append(els && els.length != null && !els.nodeType ? els : arguments);
	},

	/**
	 * Only push wraps the added element in a DomElement. splice and unshift
	 * are not overridden to do the same.
	 */
	push: function(el) {
		return this.base(DomElement.get(el));
	},

	statics: {
		inject: function(src) {
			src = typeof src == 'function' ? new src() : src || {};
			var collection = this;
			// For each function that is injected into DomElements, create a
			// new function that iterates that calls the function on each of the
			// collection's elements.
			// src can either be a function to be called, or a object literal.
			return this.base(EACH(src, function(val, key) {
				this[key] = typeof val != 'function' ? val : function() {
					// Only collect values if calling a getter function, otherwise
					// return this
					var args = arguments, get = /^get/.test(key), values;
					this.each(function(obj) {
						// Try to use original method if it's there, in order
						// to support base, as this will be the wrapper that
						// sets it
						var ret = (obj[key] || val).apply(obj, args);
						if (get) {
							values = values || ($typeof(ret) == 'element')
								? new collection() : [];
							values.push(ret);
						}
					});
					return values || this;
				}
			}, {}));
		}
	}
});

////////////////////////////////////////////////////////////////////////////////
// DomElement

DomElement = Base.extend(function() {
	var cache = {}, constructors = {}, uniqueId = 0;

	// Garbage collection - uncache elements/purge listeners on orphaned elements
	// so we don't hold a reference and cause the browser to retain them
	(function() {
		cache.each(function(obj, id) {
			var el = obj.$;
	        if(!el || !el.parentNode || (!el.offsetParent && !document.getElementById(id))) {
	            if(el && obj.dispose) obj.dispose();
	            delete cache[id];
	        }
		});
	}).periodic(30000);

	// Private inject function for DomElement. It adds support for
	// _methods and _properties declarations, which forward calls and define
	// getter / setters for fields of the native DOM node.
	function inject(src, base) {
		src = typeof src == 'function' ? new src() : src || {}; 
		// Forward method calls. Returns result if any, otherwise reference
		// to this.
		(src._methods || []).each(function(name) {
			src[name] = function() {
				// .apply seems to not be present on native dom functions on
				// Safari. Just pass on the first argument and call directly.
				var ret = this.$[name] && this.$[name](arg);
				return ret === undefined ? this : ret;
			}
		});
		// Define getter / setters
		(src._properties || []).each(function(name) {
			var part = name.capitalize();
			src['get' + part] = function() {
				return this.$[name];
			}
			src['set' + part] = function(value) {
				this.$[name] = value;
			}
		});
		delete src._methods;
		delete src._properties;
		return Function.inject.call(this, src, base);
	}

	return {
		// Tells $typeof the type to return when encountering an element.
		_type: 'element',
		_elements: DomElements,

		initialize: function(el, props) {
			// Support element creating constructors on subclasses of DomElement
			// that define prototype._tag and can take one argument, which 
			// defines the properties to be set:
			if (this._tag && /^(object|hash)$/.test($typeof(el))) {
				props = el;
				el = this._tag;
			}
			if (typeof(el) == 'string') {
				if (Browser.IE && props && (props.name || props.type))
					el = '<' + el + (props.name ? ' name="' + props.name + '"' : '')
						+ (props.type ? ' type="' + props.type + '"' : '') + '>';
				el = document.createElement(el);
			}
			var id = el.id;
			// Cache wrappers by their ids
			if(id && cache[id]) return cache[id]; // DomElement object already exists
			// Store a reference to the native element.
			this.$ = el;
			// Generate ids if the element does not define one, so it can be 
			// used for later lookup.
			if (!id) id = el.id = 'bootstrap-' + (++uniqueId);
			this.id = id;
			if (props) this.set(props);
			// Cache it
			cache[id] = this;
		},

		statics: {
			inject: function(src, base) {
				var ret = inject.call(this, src, base);
				// Now, after src was processed in #inject, inject not only into
				// this, but also into DomElements where the functions are
				// "multiplied" for each of the elements of the collection.
				this.prototype._elements.inject(src);
				return ret;
			},

			extend: function(src) {
				// Do not pass src to base, as we weed to fix #inject first.
				var ret = this.base();
				// Undo overriding of the inject method above for subclasses,
				// as only injecting into DomElement (not subclasses) shall also
				// inject into DomElements!
				inject.call(ret, src, this);
				// Now reset inject. Reseting before does not work, as it would
				// be overridden during static inheritance again.
				ret.inject = inject;
				// When extending DomElement with a tag field specified, this 
				// prototype will be used when wrapping elements of that type.
				// If this is a prototype for a certain tag, store it in the LUT.
				if (src && src._tag) constructors[src._tag] = ret;
				return ret;
			},

			get: function(el, root) {
				if (typeof(el) == 'string') {
					root = DomElement.unwrap(root);
					if (el.charAt(0) == '#') {
						el = document.getElementById(el.substring(1));
						if (el && root && !this.isAncestor(el, root))
							el = null;
					} else {
						// call dom select through this, as we want the right
						// _elements value to be used (depending on how get is
						// called, this is DomElements or HtmlElements).
						el = this.select(el, root, 1)[0];
					}
				}
				// Make sure we're using the right constructor for this tag
				return el ? el.id && cache[el.id] ||
					new (constructors[el.tagName.toLowerCase()] ||
						(el.className === undefined
							? DomElement : HtmlElement))(el) : null;
			},

			unwrap: function(el) {
				return !el || el.nodeType ? el : el.$;
			}
		}
	}
});

// Use the modified inject function from above which injects both into DomElement
// and DomElements.
DomElement.inject(function() {

	function walk(el, name, start) {
		el = el[start ? start : name];
		while (el && $typeof(el) != 'element') el = el[name];
		return DomElement.get(el);
	}

	// Dom / Html to JS property mappings, as used by getProperty, setProperty
	// and removeProperty.
	var properties = {
		'class': 'className', 'for': 'htmlFor', colspan: 'colSpan',
		rowspan: 'rowSpan', accesskey: 'accessKey', tabindex: 'tabIndex',
		maxlength: 'maxLength', readonly: 'readOnly', value: 'value',
		disabled: 'disabled', checked: 'checked', multiple: 'multiple',
		selected: 'selected'
	};

	var setterCache = {};

	return {
		set: function(props) {
			return EACH(props, function(val, key) {
				// First see if there is a setter for the given property
				var set = (key == 'events') ? this.addEvents : setterCache[key];
				// Do not call capitalize, as this is time critical and executes faster.
				// (we only need to capitalize the first char here).
				if (set === undefined)
					set = setterCache[key] = this['set' + key.charAt(0).toUpperCase() + key.substring(1)] || null;
				// If the passed value is an array, use it as the argument
				// list for the call.
				if (set) set[val && val.push ? 'apply' : 'call'](this, val);
				else this.setProperty(key, val);
			}, this);
		},

		getElements: function(selectors) {
			return DomElement.select(selectors || '*', this);
		},

		getElement: function(selector) {
			return DomElement.get(selector || '*', this);
		},

		getParents: function(selector) {
			var parents = new this._elements();
			for (var el = this.$.parentNode; el; el = el.parentNode)
				parents.push(el);
			return selector && selector != '*'
				? DomElement.filter(parents, selector, this)
				: parents;
		},

		appendChild: function(el) {
			this.$.appendChild(DomElement.get(el).$);
			return this;
		},

		insertBefore: function(el) {
			el = DomElement.get(el);
			el.$.parentNode.insertBefore(this.$, el.$);
			return this;
		},

		insertAfter: function(el) {
			el = DomElement.get(el);
			var next = el.getNext();
			if (!next) el.$.parentNode.appendChild(this.$);
			else el.$.parentNode.insertBefore(this.$, next.$);
			return this;
		},

		insertFirst: function(el) {
			// TODO: See Ext's insertFirst, add support for createChild, return
			// added element instead of this?!
			el = DomElement.get(el);
			el.$.insertBefore(this.$, el.$.firstChild);
			return this;
		},

		insertInside: function(el) {
			DomElement.get(el).appendChild(this);
			return this;
		},

		remove: function() {
			this.$.parentNode.removeChild(this.$);
			return this;
		},

		removeChild: function(el) {
			el = DomElement.get(el);
			this.$.removeChild(el.$);
			return el;
		},

		clone: function(contents) {
			return DomElement.get(this.$.cloneNode(!!contents));
		},

		replaceWith: function(el) {
			el = DomElement.get(el);
			this.$.parentNode.replaceChild(el.$, this.$);
			return el;
		},

		getPrevious: function() {
			return walk(this.$, 'previousSibling');
		},

		getNext: function() {
			return walk(this.$, 'nextSibling');
		},

		getFirst: function() {
			return walk(this.$, 'nextSibling', 'firstChild');
		},

		getLast: function() {
			return walk(this.$, 'previousSibling', 'lastChild');
		},

		getParent: function() {
			return DomElement.get(this.$.parentNode);
		},

		getChildren: function() {
			return new this._elements(this.$.childNodes);
		},

		removeChildren: function() {
			this.getChildren().remove();
		},

		hasParent: function(el) {
			return DomElement.isAncestor(this.$, DomElement.unwrap(el));
		},

		hasChild: function(el) {
			return DomElement.isAncestor(DomElement.unwrap(el), this.$);
		},

		getTag: function() {
			return this.$.tagName.toLowerCase();
		},

		getProperty: function(name) {
			var key = properties[name];
			return key ? this.$[key] : this.$.getAttribute(name);
		},

		removeProperty: function(name) {
			var key = properties[name];
			if (key) this.$[key] = '';
			else this.$.removeAttribute(name);
			return this;
		},

		setProperty: function(name, value) {
			var key = properties[name];
			if (key) this.$[key] = value;
			else this.$.setAttribute(name, value);
			return this;
		},

		setProperties: function(src) {
			return EACH(src, function(val, name) {
				this.setProperty(name, val);
			}, this);
		}
	}
});

#endif // __browser_DomElement__
