#ifndef __browser_dom_DomElement__
#define __browser_dom_DomElement__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif // HIDDEN

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
		initialize: function(elements) {
			// Define this collections's unique ID. Elements that are added to it
			// get that field set too, in order to detect multiple additions of
			// elements in one go. Notice that this does not work when elements
			// are added to another collection, then again to this one.
			// But for Dom Query functions, this is enough.
			this._unique = unique++;
			// Do not use elements.push to detect arrays, as we're passing pseudo
			// arrays here too (e.g. childNodes). But Option defines .length too,
			// so rul that out by checking nodeType as well.
			this.append(elements && elements.length != null && !elements.nodeType
				? elements : arguments);
		},

		/**
		 * Only #push wraps the added element in a DomElement. splice and unshift
		 * are NOT overridden to do the same.
		 */
		push: function() {
			this.append(arguments);
			return this.length;
		},

		append: function(items) {
			for (var i = 0, l = items.length; i < l; ++i) {
				var el = items[i];
				// Try _wrapper first, for faster performance
				if ((el = el && (el._wrapper || DomElement.get(el))) && el._unique != this._unique) {
					el._unique = this._unique;
					this[this.length++] = el;
				}
			}
			return this;
		},

		toElement: function() {
			// return the DomElements array itself. See inserters comments further bellow
			return this;
		},

		statics: {
			inject: function(src) {
				// For each function that is injected into DomElements, create a
				// new function that iterates that calls the function on each of
				// the collection's elements.
				// src can either be a function to be called, or a object literal.
				var proto = this.prototype;
				return this.base(Base.each(src || {}, function(val, key) {
					if (typeof val == 'function') {
						var func = val, prev = proto[key];
						var count = func.parameters().length, prevCount = prev && prev.parameters().length;
						val = function() {
							var args = arguments, values;
							// If there was a previous implementation under this name
							// and the arguments match better, use that one instead.
							// The strategy is very basic, if more arguments are used
							// than the function provides and the previous implementation
							// expects more, use that one.
							if (prev && args.length > count && args.length <= prevCount)
								return prev.apply(this, args);
							this.each(function(obj) {
								// Try to use original method if it's there, in order
								// to support base, as this will be the wrapper that
								// sets it
								var ret = (obj[key] || func).apply(obj, args);
								// Only collect return values if defined and not
								// returning 'this'.
								if (ret !== undefined && ret != obj) {
									values = values || (Base.type(ret) == 'element'
										? new obj._elements() : []);
									values.push(ret);
								}
							});
							return values || this;
						}
					}
					this[key] = val; 
				}, {}));
			}
		}
	};
});

////////////////////////////////////////////////////////////////////////////////
// DomElement

DomElement = Base.extend(new function() {
	var elements = [];
	// LUTs for tags and class based constructors. Bootstrap can automatically
	// use sub-prototype of DomElement for any given wrapped element based on
	// its className Attribute. the sub-prototype only needs to define _class
	var tags = {}, classes = {}, classCheck, unique = 0;

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
					el._wrapper = el._unique = null;
				}
				if (!force) elements.splice(i, 1);
	        }
		}
	}
	// TODO: this seems to cause problems. Turn off for now.
	// dispose.periodic(30000);

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
		// Use DomElement as as the default, HtmlElement for anything with
		// className !== undefined and special constructors based on tag names.
		// tags stores both upper-case and lower-case references for higher
		// speed.
		// classCheck only exists if HtmlElement was extended with prototypes
		// defining _class. In this case, classCheck is a regular expression that
		// checks className for the occurence of any of the prototype mapped 
		// classes, and returns the first occurence, which is then used to
		// decide for constructor. This allows using e.g. "window hidden" for
		// element that should map to a window prototype.
		var match;
		// Check classCheck first, since it can override the _tag setting
		return classCheck && el.className && (match = el.className.match(classCheck)) && match[2] && classes[match[2]] ||
			// Check _tag settings for prototypes bound to tagNames, e.g. form, etc
			el.tagName && tags[el.tagName] ||
			// Basic Html elements
			el.className !== undefined && HtmlElement ||
			// Check views / windows
			// TODO: does this always work? What is the way to really know it's a view? How to distinguish DomView from HtmlView?
			el.location && el.frames && el.history && HtmlView ||
			// Check documents
			el.nodeName == '#document' && (document.documentElement.nodeName.toLowerCase() == 'html' && HtmlDocument || DomDocument) ||
			// Everything else
			DomElement;
	}

	var dont = {};

	return {
		// Tells Base.type the type to return when encountering an element.
		_type: 'element',
		_elements: DomElements,

		initialize: function(el, props, doc) {
			// Support element creating constructors on subclasses of DomElement
			// that define prototype._tag and can take one argument, which 
			// defines the properties to be set:
			if (this._tag && Base.type(el) == 'object') {
				props = el;
				el = this._tag;
			}
			// doc is only used when producing an element from a string.
			if (typeof(el) == 'string') {
				// Call the internal creation helper. This does not fully set props,
				// only the one needed for the IE workaround. set(props) is called
				// further bellow.
				el = DomElement.create(el, props, doc);
			} else if (el._wrapper) {
				// Does the DomElement wrapper for this element already exist?
				return el._wrapper;
			}
			if (props === dont) {
				props = null;
			} else {
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
			// Not all elements allow setting of values. E.g. on IE, textnodes don't
			// Now text nodes should not even be wrapped here, but they are needed
			// in #getChildren / getChildren.remove(). TODO: find a solution?
			// Until then, we just ingore them and do not store the wrapper.
			try {
				el._wrapper = this;
				elements[elements.length] = el;
			} catch (e) {} // Ignore error
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
				// If initialize is defined, explicitely calls this.base(el, props)
				// here. This is a specialy case for DomElement extension that does
				// not require the user to call this, since it is used for _class
				// stuff often.
				var init = src.initialize;
				if (init) src.initialize = function(el, props) {
					var ret = this.base(el, props);
					if (ret) return ret;
					init.call(this);
				}
				// Undo overriding of the inject method above for subclasses,
				// as only injecting into DomElement (not subclasses) shall also
				// inject into DomElements!
				inject.call(ret, src);
				// Now reset inject. Reseting before does not work, as it would
				// be overridden during static inheritance again.
				ret.inject = inject;
				// When extending DomElement with a tag name field specified, this 
				// prototype will be used when wrapping elements of that type.
				// If this is a prototype for a certain tag name, store it in the LUT.
				if (src) {
					// tags stores both upper-case and lower-case references
					// for higher speed in getConstructor, since tagName can
					// be used for direct lookup, regardless of its case.
					if (src._tag)
						tags[src._tag.toLowerCase()] = tags[src._tag.toUpperCase()] = ret;
					// classCheck is null until a sub-prototype defines _class
					if (src._class) {
						classes[src._class] = ret;
						// Create a regular expression that allows detection of
						// the first prototype mapped className. This needs to
						// contain all defined classes. See getConstructor
						// e.g.: /(^|\s)(post-it|window)(\s|$)/
						classCheck = new RegExp('(^|\\s)(' + Base.each(classes, function(val, name) {
							this.push(name);
						}, []).join('|') + ')(\\s|$)');
						// If the prototype defines an initialize method, and it
						// does not want to be lazily loaded, force wrapping of
						// these elements on domready, so that initialize will be
						// directly called and further dom manipulation can be done.
						if (!src._lazy && src.initialize) Document.addEvent('domready', function() {
							Document.getElements('.' + src._class);
						});
					}
				}
				return ret;
			},

			get: function(el) {
				return el ? typeof el == 'string'
					? Document.getElement(el)
					// Make sure we're using the right constructor.
					: el._wrapper || el._elements && el || new (getConstructor(el))(el, dont)
						: null;
			},

			/**
			 * This is only a helper method that's used both in Document and DomElement.
			 * It does not fully set props, only the values needed for a IE workaround.
			 * It also returns an unwrapped object, that needs to further initalization
			 * and setting of props.
			 * This is needed to avoid production of two objects to match the proper
			 * prototype when using new HtmlElement(name, props).
			 */
			create: function(tag, props, doc) {
				if (Browser.IE && props) {
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

			unwrap: function(el) {
				return el && el.$ || el;
			},

			collect: function(el) {
				elements.push(el);
			},

			unique: function(el) {
				if (!el._unique) {
					DomElement.collect(el);
					el._unique = ++unique;
				}
			},

			isAncestor: function(el, parent) {
				// TODO: See Ext for a faster implementation
				if (parent != document)
					for (el = el && el.parentNode; el != parent; el = el.parentNode)
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


	// handle() handles both get and set calls for any given property name.
	// prefix is either set or get, and is used for lookup of getter / setter
	// methods. get/setProperty is used as a fallback.
	// See DomElement#get/set
	function handle(that, prefix, name, value) {
		var ctor = that.__proto__.constructor;
		// handle caches getter and setter functions for given property names.
		// Store the handlers in the constructor of each prototype, so caching
		// between different sub-prototypes that might redefine getter/setters
		// does not get mixed up:
		var handlers = ctor.handlers = ctor.handlers || { get: {}, set: {} };
		var list = handlers[prefix];
		// First see if there is a getter / setter for the given property
		var fn = name == 'events' && prefix == 'set' ? that.addEvents : list[name];
		if (fn === undefined)
			fn = list[name] = that[prefix + name.capitalize()] || null;
		// If the passed value is an array, use it as the argument
		// list for the call.
		if (fn) return fn[Base.type(value) == 'array' ? 'apply' : 'call'](that, value);
		else return that[prefix + 'Property'](name, value);
	}

	// A helper for walking the DOm
	function walk(el, name, start) {
		el = el[start ? start : name];
		while (el && Base.type(el) != 'element') el = el[name];
		return DomElement.get(el);
	}

	// A helper for calling toElement and returning results.
	function toElements(elements) {
		// Support passing things as argument lists, without the first wrapping array
		if (Base.type(elements) != 'array')
			elements = Array.create(arguments);
		// Find out if elements are created, or if they were already bassed.
		// The convention is to return the newly created elements if they are not
		// elements already, otherwise return this.
		var created = elements.find(function(el) {
			return Base.type(el) != 'element';
		});
		// toElement can either return a single DomElement or a DomElements array.
		var result = elements.toElement(this.getDocument());
		return {
			// Make sure we always return an array of the resulted elements as well,
			// for simpler handling in inserters below
			array: result ? (Base.type(result) == 'array' ? result : [result]) : [],
			// Result might be a single element or an array, depending on what the
			// user passed. This is to be returned back. Only define it if the elements
			// were created.
			result: created && result
		};
	}

	var fields = {
		set: function(name, value) {
			switch (Base.type(name)) {
				case 'string':
					return handle(this, 'set', name, value);
				case 'object':
					return Base.each(name, function(value, key) {
						handle(this, 'set', key, value);
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

		getDocument: function() {
			return DomElement.get(this.$.ownerDocument);
		},

		getView: function() {
			return this.getDocument().getView();
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
			if (el = DomElement.get(el)) {
#ifdef BROWSER_LEGACY
				// Fix a bug on Mac IE when inserting Option elements to Select 
				// elements, where the text on these objects is lost after insertion
				// -> inserters.before does the same.
				var text = Browser.IE && el.text;
#endif // BROWSER_LEGACY
				this.$.appendChild(el.$);
#ifdef BROWSER_LEGACY
				if (text) this.$.text = text;
#endif // BROWSER_LEGACY
			}
			return this;
		},

		// TODO: Consider naming this append
		appendChildren: function() {
			return Array.flatten(arguments).each(function(el) {
				this.appendChild($(DomElement.get(el)));
			}, this);
		},

		appendText: function(text) {
			this.$.appendChild(this.getDocument().createTextNode(text));
			return this;
		},

		wrap: function() {
			var el = this.injectBefore.apply(this, arguments), last;
			do {
				last = el;
				el = el.getFirst();
			} while(el);
			last.appendChild(this);
			return last;
		},

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
			var children = this.getChildren();
			children.remove();
			return children;
		},

		replaceWith: function(el) {
			if (this.$.parentNode) {
				// Use toElements to support on the fly creation of one or more
				// elements to replace with:
				el = toElements.apply(this, arguments);
				var els = el.array;
				// Replace the first item of the array and insert all the others
				// afterwards, if there are more than one:
				if (els.length > 0)
					this.$.parentNode.replaceChild(els[0].$, this.$);
				for (var i = els.length - 1; i >= 1; i--)
					els[i].insertAfter(els[0]);
				return el.result;
			}
			return null;
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
			return Base.each(src, function(value, name) {
				this.setProperty(name, value);
			}, this);
		},

		toString: function() {
			return (this.$.tagName || this._type).toLowerCase() +
				(this.$.id ? '#' + this.$.id : '');
		},

		toElement: function() {
			return this;
		}
	};

	// Inserters are only used internally and can assume the source and dest
	// elements to be wrapped elements.
	var inserters = {
		/**
		 * Inserts the source element before the dest element in the DOM.
		 */
		before: function(source, dest) {
			if (source && dest && dest.$.parentNode) {
#ifdef BROWSER_LEGACY
				// Fix a bug on Mac IE when inserting Option elements to Select 
				// elements, where the text on these objects is lost after insertion.
				// -> DomElement#appendChild does the same.
				var text = Browser.IE && dest.$.text;
#endif // BROWSER_LEGACY
				dest.$.parentNode.insertBefore(source.$, dest.$);
#ifdef BROWSER_LEGACY
				if (text) source.$.text = text;
#endif // BROWSER_LEGACY
			}
		},

		/**
		 * Inserts the source element after the dest element in the DOM.
		 */
		after: function(source, dest) {
			if (source && dest && dest.$.parentNode) {
				var next = dest.getNext();
				// Do not use the native methods since these do not include the
				// workaround for legacy browsers above. Once that part is
				// deprecated, we can change strategy here. Might be bit faster.
				if (next) source.insertBefore(next);
				else dest.getParent().appendChild(source);
			}
		},

		/**
		 * Inserts the source element at the bottom of the dest element's children.
		 */
		bottom: function(source, dest) {
			if (source && dest)
				dest.appendChild(source);
		},

		/**
		 * Inserts the source element at the top of the dest element's children.
		 */
		top: function(source, dest) {
			if (source && dest) {
				var first = dest.getFirst();
				if (first) source.insertBefore(first);
				else dest.appendChild(source);
			}
		}
	};

	inserters.inside = inserters.bottom;

	// Now add the inserters
	// Important: The inseters return this if the object passed is already an 
	// element. But if it is a string or an array that is converted to an element,
	// the newly created element is returned instead.

	Base.each(inserters, function(inserter, name) {
		var part = name.capitalize();
		// #insert* acts like the dom #insert* functions, inserting this element
		// into the passed element(s).
		fields['insert' + part] = function(el) {
			el = toElements.apply(this, arguments);
			// Clone the object for every index other than the first
			// as we're inserting into multiple times.
			for (var i = 0, list = el.array, l = list.length; i < l; i++)
				inserter(i == 0 ? this : this.clone(true), list[i]);
			return el.result || this;
		}

		// #inject* does the reverse of #insert*, it injects the passed element(s)
		// into this element.
		fields['inject' + part] = function(el) {
			el = toElements.apply(this, arguments);
			for (var i = 0, list = el.array, l = list.length; i < l; i++)
				inserter(list[i], this);
			return el.result || this;
		}
	});

	return fields;
});

#endif // __browser_dom_DomElement__
