#ifndef __browser_dom_DomElement__
#define __browser_dom_DomElement__

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
DomElements = Array.extend(new function() {
	var unique = 0;
	
	return {
		initialize: function(els) {
			// Define this collections's unique ID. Elements that are added to it
			// get that field set too, in order to detect multiple additions of
			// elements in one go. Notice that this does not work when elements
			// are added to another collection, then again to this one.
			// But for Dom Query functions, this is enough.
			this._unique = unique++;
			// Do not use els.push to detect arrays, as we're passing pseudo
			// arrays here too (e.g. childNodes). But Option defines .length too,
			// so rul that out by checking nodeType as well.
			this.append(els && els.length != null && !els.nodeType ? els : arguments);
		},

		/**
		 * Only push wraps the added element in a DomElement. splice and unshift
		 * are not overridden to do the same.
		 */
		push: function() {
			for (var i = 0, j = arguments.length; i < j; ++i) {
				var el = arguments[i];
				// Try _wrapper first, for faster performance
				if ((el = el && (el._wrapper || DomElement.get(el))) && el._unique != this._unique) {
					el._unique = this._unique;
					this[this.length++] = el;
				}
			}
			return this.length;
		},

		statics: {
			inject: function(src) {
				var collection = this;
				// For each function that is injected into DomElements, create a
				// new function that iterates that calls the function on each of
				// the collection's elements.
				// src can either be a function to be called, or a object literal.
				return this.base(Base.each(src || {}, function(val, key) {
					this[key] = typeof val != 'function' ? val : function() {
						// Only collect values if calling a getter function,
						// otherwise return this
						var args = arguments, get = /^get/.test(key), values;
						this.each(function(obj) {
							// Try to use original method if it's there, in order
							// to support base, as this will be the wrapper that
							// sets it
							var ret = (obj[key] || val).apply(obj, args);
							if (get) {
								values = values || (Base.type(ret) == 'element'
									? new collection() : []);
								values.push(ret);
							}
						});
						return values || this;
					}
				}, {}));
			}
		}
	};
});

////////////////////////////////////////////////////////////////////////////////
// DomElement

DomElement = Base.extend(new function() {
	var elements = [], constructors = {}, uniqueId = 0;

	// Garbage collection - uncache elements/purge listeners on orphaned elements
	// so we don't hold a reference and cause the browser to retain them.
	function dispose(force) {
		for (var i = elements.length - 1; i >= 0; i--) {
			var el = elements[i];
	        if (force || (!el || el != window && el != document &&
				(!el.parentNode || !el.offsetParent))) {
	            if (el) {
					var obj = el._wrapper;
					if (obj && obj.dispose) obj.dispose();
					el._wrapper = el._children = null;
				}
				if (!force) elements.splice(i, 1);
	        }
		}
	}
	dispose.periodic(30000);

	// Private inject function for DomElement. It adds support for
	// _methods and _properties declarations, which forward calls and define
	// getter / setters for fields of the native DOM node.
	function inject(src) {
		// Forward method calls. Returns result if any, otherwise reference
		// to this.
		src = src || {};
		(src._methods || []).each(function(name) {
			src[name] = function(arg) {
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
				return this;
			}
		});
		delete src._methods;
		delete src._properties;
		return Function.inject.call(this, src);
	}

	function getConstructor(el) {
		return el.tagName && constructors[el.tagName.toLowerCase()] ||
			(el.className === undefined ? DomElement : HtmlElement)
	}

	var dont = {};

	return {
		// Tells Base.type the type to return when encountering an element.
		_type: 'element',
		_elements: DomElements,

		initialize: function(el, props) {
			// Support element creating constructors on subclasses of DomElement
			// that define prototype._tag and can take one argument, which 
			// defines the properties to be set:
			if (this._tag && Base.type(el) == 'object') {
				props = el;
				el = this._tag;
			}
			if (typeof(el) == 'string') {
				if (Browser.IE && props && (props.name || props.type))
					el = '<' + el
						+ (props.name ? ' name="' + props.name + '"' : '')
						+ (props.type ? ' type="' + props.type + '"' : '') + '>';
				el = document.createElement(el);
			} else {
				// Does the DomElement wrapper for this element already exist?
				if (el._wrapper) return el._wrapper;
			}
			if (props == dont) props = null;
			else {
				// Check if we're using the right constructor, if not, construct
				// with the right one:
				var ctor = getConstructor(el);
				if (ctor != this.constructor)
					return new ctor(el, props);
			}
			// Store a reference to the native element.
			this.$ = el;
			// Store a reference in the native element to the wrapper. 
			// Needs to be cleaned up by garbage collection. See above
			el._wrapper = this;
			elements[elements.length] = el;
			if (props) this.set(props);
		},

		statics: {
			inject: function(src) {
				if (src) {
					// Produce generic-versions for each of the injected
					// non-static methods, so that they function on native
					// methods instead of wrapped ones. This means
					// DomElement.getProperty(el, name) can be called on non
					// wrapped elements.
					var proto = this.prototype, that = this;
					src.statics = Base.each(src, function(val, name) {
						if (typeof val == 'function' && !this[name] && !that[name]) {
							// We need to be fast, so assume a maximum of two
							// params instead of using Function#apply.
							this[name] = function(el, param1, param2) {
								if (el) try {
									// Use the ugly but fast trick of setting
									// $ on the prototype and call throught
									// that, then erase again.
									proto.$ = el.$ || el;
									return proto[name](param1, param2);
								} finally {
									delete proto.$;
								}
							}
						}
					}, src.statics || {});
					inject.call(this, src);
					// Remove toString, as we do not want it to be multiplied in
					// _elements (it would not return a string but an array then).
					delete src.toString;
					// Now, after src was processed in #inject, inject not only
					// into this, but also into DomElements where the functions
					// are "multiplied" for each of the elements of the collection.
					proto._elements.inject(src);
				}
				return this;
			},

			extend: function(src) {
				// Do not pass src to base, as we weed to fix #inject first.
				var ret = this.base();
				// Undo overriding of the inject method above for subclasses,
				// as only injecting into DomElement (not subclasses) shall also
				// inject into DomElements!
				inject.call(ret, src);
				// Now reset inject. Reseting before does not work, as it would
				// be overridden during static inheritance again.
				ret.inject = inject;
				// When extending DomElement with a tag field specified, this 
				// prototype will be used when wrapping elements of that type.
				// If this is a prototype for a certain tag, store it in the LUT.
				if (src && src._tag) constructors[src._tag] = ret;
				return ret;
			},

			get: function(el) {
				// Make sure we're using the right constructor. DomElement as 
				// the default, HtmlElement for anything with className !== undefined
				// and special constructors based on tag names.
				return el ? el._wrapper || el._elements && el || new (getConstructor(el))(el, dont) : null;
			},

			unwrap: function(el) {
				return el && el.$ || el;
			},

			collect: function(el) {
				elements.push(el);
			},

			isAncestor: function(el, parent) {
				// TODO: See Ext for a faster implementation
				if (parent != document)
					for (el = el.parentNode; el != parent; el = el.parentNode)
						if (!el) return false;
				return true;
			},

			dispose: function() {
				dispose(true);
			}
		}
	}
});

// Use the modified inject function from above which injects both into DomElement
// and DomElements.
DomElement.inject(new function() {
	// Dom / Html to JS property mappings, as used by getProperty, setProperty
	// and removeProperty.
	var properties = {
		'class': 'className', className: 'className', 'for': 'htmlFor',
		colspan: 'colSpan', rowspan: 'rowSpan', accesskey: 'accessKey',
		tabindex: 'tabIndex', maxlength: 'maxLength', readonly: 'readOnly',
		value: 'value', disabled: 'disabled', checked: 'checked',
		multiple: 'multiple', selected: 'selected'
	};

	var flags = {
		href: 2, src: 2
	};

	// handlers caches getter and setter functions for given property names.
	// See handle()
	var handlers = { get: {}, set: {} };

	// handle() handles both get and set calls for any given property name.
	// prefix is either set or get, and is used for lookup of getter / setter
	// methods. get/setProperty is used as a fallback.
	// See DomElement#get/set
	function handle(that, prefix, name, val) {
		var list = handlers[prefix];
		// First see if there is a getter / setter for the given property
		var fn = name == 'events' && prefix == 'set' ? that.addEvents : list[name];
		// Do not call capitalize, as this is time critical and executes
		// faster (we only need to capitalize the first char here).
		if (fn === undefined)
			fn = list[name] = that[prefix +
				name.charAt(0).toUpperCase() + name.substring(1)] || null;
		// If the passed value is an array, use it as the argument
		// list for the call.
		if (fn) return fn[val && val.push ? 'apply' : 'call'](that, val);
		else return that[prefix + 'Property'](name, val);
	}

	function walk(el, name, start) {
		el = el[start ? start : name];
		while (el && Base.type(el) != 'element') el = el[name];
		return DomElement.get(el);
	}

	function create(where) {
		return function() {
			return this.create(arguments)['insert' + where](this);
		}
	}

	return {
		set: function(name, value) {
			switch (Base.type(name)) {
				case 'string':
					return handle(this, 'set', name, value);
				case 'object':
					return Base.each(name, function(val, key) {
						handle(this, 'set', key, val);
					}, this);
			}
			return this;
		},

		get: function(name) {
			return handle(this, 'get', name);
		},

		getTag: function() {
			return this.$.tagName.toLowerCase();
		},

		getId: function() {
			return this.$.id;
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

		hasChildren: function() {
			return this.$.hasChildNodes();
		},

		hasParent: function(el) {
			return DomElement.isAncestor(this.$, DomElement.unwrap(el));
		},

		hasChild: function(el) {
			return DomElement.isAncestor(DomElement.unwrap(el), this.$);
		},

		appendChild: function(el) {
			el = DomElement.get(el).$;
			// Fix a bug on Mac IE when inserting Option elements to Select 
			// elements, where the text on these objects is lost after insertion
			var text = Browser.IE && el.text;
			this.$.appendChild(el);
			if (text) el.text = text;
			return this;
		},

		insertBefore: function(el) {
			el = DomElement.get(el);
			// See appendChild
			var text = Browser.IE && el.text;
			el.$.parentNode.insertBefore(this.$, el.$);
			if (text) this.$.text = text;
			return this;
		},

		insertAfter: function(el) {
			el = DomElement.get(el);
			var next = el.getNext();
			if (next) this.insertBefore(next);
			else el.getParent().appendChild(this);
			return this;
		},

		insertFirst: function(el) {
			el = DomElement.get(el);
			var first = el.getFirst();
			if (first) this.insertBefore(first);
			else el.appendChild(this);
			return this;
		},

		insertInside: function(el) {
			DomElement.get(el).appendChild(this);
			return this;
		},

		appendText: function(text) {
			this.$.appendChild(document.createTextNode(text));
			return this;
		},

		create: function(arg) {
			var items = Base.type(arg) == 'array' ? arg : arguments;
			var elements = new this._elements();
			for (var i = 0, j = items.length; i < j; i ++) {
				var item = items[i];
				// items are arrays of any of these forms:
				// [tag, properties, content]
				// [tag, properties]
				// [tag, content]
				// content is either an array of other items, or a string, in 
				// which case it is appended as a string
				var props = item[1], content = item[2];
				if (!content && Base.type(props) != 'object') {
					content = props;
					props = null;
				}
				// Calling the DomElement constructor will automatically call
				// the constructor of the right subclass.
				var el = new DomElement(item[0], props);
				if (content) {
					// If the content array is only one item, wrap it in another
					// array, to create the items array.
					if (content.push) this.create(Base.type(content[0]) == 'string'
						? [content] : content).insertInside(el);
					else el.appendText(content);
				}
				elements.push(el);
			}
			// Return the element only if we're creating one, otherwise return a
			// elements array.
			return elements.length > 1 ? elements : elements[0];
		},

		createBefore: create('Before'),

		createAfter: create('After'),

		createFirst: create('First'),

		createInside: create('Inside'),

		remove: function() {
			if (this.$.parentNode)
				this.$.parentNode.removeChild(this.$);
			return this;
		},

		removeChild: function(el) {
			el = DomElement.get(el);
			this.$.removeChild(el.$);
			return el;
		},

		removeChildren: function() {
			this.getChildren().remove();
		},

		replaceWith: function(el) {
			el = DomElement.get(el);
			if (this.$.parentNode)
				this.$.parentNode.replaceChild(el.$, this.$);
			return el;
		},

		clone: function(contents) {
			return DomElement.get(this.$.cloneNode(!!contents));
		},

		getProperty: function(name) {
			var key = properties[name];
			if (key) return this.$[key];
			var flag = flags[name];
			if (!Browser.IE || flag) return this.$.getAttribute(name, flag);
			var node = this.$.attributes[name];
			return node && node.nodeValue;
		},

		setProperty: function(name, value) {
			var key = properties[name];
			if (key) this.$[key] = value;
			else this.$.setAttribute(name, value);
			return this;
		},

		removeProperty: function(name) {
			var key = properties[name];
			if (key) this.$[key] = '';
			else this.$.removeAttribute(name);
			return this;
		},

		setProperties: function(src) {
			return Base.each(src, function(val, name) {
				this.setProperty(name, val);
			}, this);
		},

		toString: function() {
			return this.getTag() + (this.$.id ? '#' + this.$.id : '');
		}
	}
});

#endif // __browser_dom_DomElement__