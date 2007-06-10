#ifndef __browser_HtmlElement__
#define __browser_HtmlElement__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif

////////////////////////////////////////////////////////////////////////////////
// HtmlElements

/**
 * HtmlElements extends inject so that each of the functions
 * defined bellow are executed on the whole set of elements, and the
 * returned values are collected in an array and converted to a HtmlElements
 * array again, if it contains only html elements.
 */
HtmlElements = Array.extend({
	initialize: function(els) {
		// Instances of HtmlElements are not real arrays, but they inherit from
		// Array. Setting length to 0 is all that's needed to make all the
		// native array functions works. Modifying length later will not clear
		// the fields from the array though.
		this.length = 0;
		// Do not use els.push do detect arrays, as we're passing pseudo arrays
		// here too (e.g. childNodes). But Option defines .length too, so rule
		// that out by checking nodeType as well.
		this.append(els && els.length && !els.nodeType ? els : arguments);
	},

	/**
	 * Only push wraps the added element in a HtmlElement. splice and unshift
	 * are not overridden to do the same.
	 */
	push: function(el) {
		return this.base(HtmlElement.get(el));
	},

	statics: {
		inject: function(src) {
			src = typeof src == 'function' ? new src() : src || [];
			// For each function that is injected into HtmlElements, create a
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
								? new HtmlElements() : [];
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
// HtmlElement

HtmlElement = Base.extend(function() {
	var cache = {}, tags = {}, uniqueId = 0;

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

	// Private inject function for HtmlElement. It adds support for
	// _methods and _properties declarations, which forward calls and define
	// getter / setters for fields of the native DOM node.
	function inject(src, base) {
		src = typeof src == 'function' ? new src() : src || []; 
		// Forward method calls. Returns result if any, otherwise reference
		// to this.
		(src._methods || []).each(function(name) {
			src[name] = function() {
				var ret = this.$[name].apply(this.$, arguments);
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
		initialize: function(el, props) {
			// Support element creating constructors on subclasses of HtmlElement
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
			if(id && cache[id]) return cache[id]; // HtmlElement object already exists
			// Make sure we're using the right constructor for this tag
			var ctor = tags[el.tagName.toLowerCase()] || HtmlElement;
			if (this.constructor != ctor) return new ctor(el, props);
			this.$ = el;
			// Generate ids if the element does not define one
			if (!id) id = el.id = 'bootstrap-' + (++uniqueId);
			this.id = id;
			this.style = el.style;
			if (props) this.set(props);
			// Cache it
			cache[id] = this;
		},

		statics: {
			inject: function(src, base) {
				var ret = inject.call(this, src, base);
				// Now, after src was processed in #inject, inject not only into
				// this, but also into HtmlElements where the functions are
				// "multiplied" for each of the elements of the collection.
				HtmlElements.inject(src, base);
				return ret;
			},

			extend: function(src) {
				// Do not pass src to base, as we weed to fix #inject first.
				var ret = this.base();
				// Undo overriding of the inject method above for subclasses,
				// as only injecting into HtmlElement (not subclasses) shall also
				// inject into HtmlElements!
				inject.call(ret, src, this);
				// Now reset inject. Reseting before does not work, as it would
				// be overridden during static inheritance again.
				ret.inject = inject;
				// When extending HtmlElement with a tag field specified, this 
				// prototype will be used when wrapping elements of that type.
				// If this is a prototype for a certain tag, store it in the LUT.
				if (src && src._tag) tags[src._tag] = ret;
				return ret;
			},

			get: function(el, root) {
				if (typeof(el) == 'string') {
					root = HtmlElement.unwrap(root);
					if (el.charAt(0) == '#') {
						el = document.getElementById(el.substring(1));
						if (el && root && !DomQuery.isAncestor(el, root))
							el = null;
					} else {
						el = HtmlElement.select(el, root, 1)[0];
					}
				}
				return el ? el.id && cache[el.id] || new HtmlElement(el) : null;
			},

			unwrap: function(el) {
				return !el || el.nodeType ? el : el.$;
			}
		}
	}
});

// Short-cut to HtmlElement.get
$ = HtmlElement.get;

// Use the modified inject function from above which injects both into HtmlElement
// and HtmlElements.
HtmlElement.inject(function() {
	
	function walk(el, name, start) {
		el = el[start ? start : name];
		while (el && $typeof(el) != 'element') el = el[name];
		return HtmlElement.get(el);
	}

	// Html to JS property mappings, as used by getProperty, setProperty
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
		// Tells $typeof the type to return when encountering an element.
		_type: 'element',

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
			return HtmlElement.select(selectors || '*', this);
		},

		getElement: function(selector) {
			return HtmlElement.get(selector || '*', this);
		},

		getParents: function(selector) {
			var parents = [];
			for (var el = this.$.parentNode; el; el = el.parentNode)
				parents.push(el);
			return selector && selector != '*'
				? HtmlElement.filter(parents, selector, this)
				: parents;
		},

		appendChild: function(el) {
			this.$.appendChild(HtmlElement.get(el).$);
			return this;
		},

		appendText: function(text) {
			if (Browser.IE) {
				switch (this.getTag()) {
				case 'style': this.$.styleSheet.cssText = text; return this;
				case 'script': this.$.setProperty('text', text); return this;
				}
			}
			this.appendChild(document.createTextNode(text));
			return this;
		},

		insertBefore: function(el) {
			el = HtmlElement.get(el);
			el.$.parentNode.insertBefore(this.$, el.$);
			return this;
		},

		insertAfter: function(el) {
			el = HtmlElement.get(el);
			var next = el.getNext();
			if (!next) el.$.parentNode.appendChild(this.$);
			else el.$.parentNode.insertBefore(this.$, next.$);
			return this;
		},

		insertFirst: function(el) {
			// TODO: See Ext's insertFirst, add support for createChild, return
			// added element instead of this?!
			el = HtmlElement.get(el);
			el.$.insertBefore(this.$, el.$.firstChild);
			return this;
		},

		insertInside: function(el) {
			HtmlElement.get(el).appendChild(this);
			return this;
		},

		remove: function() {
			this.$.parentNode.removeChild(this.$);
			return this;
		},

		removeChild: function(el) {
			el = HtmlElement.get(el);
			this.$.removeChild(el.$);
			return el;
		},

		clone: function(contents) {
			return HtmlElement.get(this.$.cloneNode(!!contents));
		},

		replaceWith: function(el) {
			el = HtmlElement.get(el);
			this.$.parentNode.replaceChild(el.$, this.$);
			return el;
		},

		hasClass: function(name) {
			return (' ' + this.$.className + ' ').indexOf(' ' + name + ' ') != -1;
			// The above performs faster than this:
			// return new RegExp('(^|\\s*)' + name + '(\\s*|$)').test(this.className);
		},

		modifyClass: function(name, add) {
			if (!this.hasClass(name) ^ !add) // xor
				this.$.className = (add ? this.$.className + ' ' + name : 
					this.$.className.replace(name, '')).clean();
			return this;
		},

		addClass: function(name) {
			return this.modifyClass(name, true);
		},

		removeClass: function(name) {
			return this.modifyClass(name, false);
		},

		toggleClass: function(name) {
			return this.modifyClass(name, !this.hasClass(name));
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
			return HtmlElement.get(this.$.parentNode);
		},

		getChildren: function() {
			return new HtmlElements(this.$.childNodes);
		},

		removeChildren: function() {
			this.getChildren().remove();
		},

		hasParent: function(el) {
			return DomQuery.isAncestor(this.$, HtmlElement.unwrap(el));
		},

		hasChild: function(el) {
			return DomQuery.isAncestor(HtmlElement.unwrap(el), this.$);
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
		},

		getHtml: function() {
			return this.$.innerHTML;
		},

		setHtml: function(html) {
			this.$.innerHTML = html;
			return this;
		}
	}
});

#endif // __browser_HtmlElement__
