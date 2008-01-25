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
	// LUTs for tag and class based constructors. Bootstrap can automatically
	// use sub prototype of DomElement for any given wrapped element based on
	// its className Attribute. the sub prototype only needs to define _class
	var names = {}, classes = {}, classCheck, unique = 0;

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
		// names stores both upper-case and lower-case references for higher
		// speed.
		// classCheck only exists if HtmlElement was extended with prototypes
		// defining _class. In this case, classCheck is a regular expression that
		// checks className for the occurence of any of the prototype mapped 
		// classes, and returns the first occurence, which is then used to
		// decide for constructor. This allows using e.g. "window hidden" for
		// element that should map to a window prototype.
		var match;
		// Check classCheck first, since it can override the _name setting
		return classCheck && el.className && (match = el.className.match(classCheck)) && match[2] && classes[match[2]] ||
			// Check _name settings for prototypes bound to nodeNames, e.g. #document, form, etc
			el.nodeName && names[el.nodeName] ||
			// Check views / windows
			el.location && el.frames && el.history && DomView ||
			// Basic Html elements
			el.className !== undefined && HtmlElement ||
			// Everything else
			DomElement;
	}

	var dont = '';

	return {
		// Tells Base.type the type to return when encountering an element.
		_type: 'element',
		_elements: DomElements,

		initialize: function(el, props, doc) {
			// Support element creating constructors on subclasses of DomElement
			// that define prototype._name and can take one argument, which 
			// defines the properties to be set:
			if (this._name && Base.type(el) == 'object') {
				props = el;
				el = this._name;
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
				// When extending DomElement with a tag field specified, this 
				// prototype will be used when wrapping elements of that type.
				// If this is a prototype for a certain tag, store it in the LUT.
				if (src) {
					// names stores both upper-case and lower-case references
					// for higher speed in getConstructor, since nodeName can
					// be used for direct lookup, regardless of its case.
					if (src._name)
						names[src._name.toLowerCase()] = names[src._name.toUpperCase()] = ret;
					// classCheck is null until a sub prototype defines _class
					if (src._class) {
						classes[src._class] = ret;
						// Create a regular expression that allows detection of
						// the first prototype mapped className. This needs to
						// contain all defined classes. See getConstructor
						// e.g.: /(^|\s)(post-it|window)(\s|$)/
						classCheck = new RegExp('(^|\\s)(' + Base.each(classes, function(val, name) {
							this.push(name);
						}, []).join('|') + ')(\\s|$)');
						// If the prototype defines an initialize method, force
						// wrapping of these elements on domready, so that 
						// initialize will be directly called and further
						// manipulation can be done, e.g. adding shadows.
						if (src.initialize) Document.addEvent('domready', function() {
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
			create: function(name, props, doc) {
				if (Browser.IE && props) {
					['name', 'type', 'checked'].each(function(key) {
						if (props[key]) {
							name += ' ' + key + '="' + props[key] + '"';
							if (key != 'checked')
								delete props[key];
						}
					});
					name = '<' + name + '>';
				}
				return (DomElement.unwrap(doc) || document).createElement(name);
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

	// handlers caches getter and setter functions for given property names.
	// See handle()
	var handlers = { get: {}, set: {} };

	// handleProperty() handles both get and set calls for any given property name.
	// prefix is either set or get, and is used for lookup of getter / setter
	// methods. get/setProperty is used as a fallback.
	// See DomElement#get/set
	function handle(that, prefix, name, value) {
		var list = handlers[prefix];
		// First see if there is a getter / setter for the given property
		var fn = name == 'events' && prefix == 'set' ? that.addEvents : list[name];
		if (fn === undefined)
			fn = list[name] = that[prefix + name.capitalize()] || null;
		// If the passed value is an array, use it as the argument
		// list for the call.
		if (fn) return fn[value && value.push ? 'apply' : 'call'](that, value);
		else return that[prefix + 'Property'](name, value);
	}

	function walk(el, name, start) {
		el = el[start ? start : name];
		while (el && Base.type(el) != 'element') el = el[name];
		return DomElement.get(el);
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
			return DomElement.get(this.ownerDocument);
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
			// TODO: document
			this.$.appendChild(document.createTextNode(text));
			return this;
		},

		wrap: function() {
			var el = this.create(arguments), last;
			el.insertBefore(this);
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
			return Base.each(src, function(value, name) {
				this.setProperty(name, value);
			}, this);
		},

		toString: function() {
			return (this.$.nodeName || this._type).toLowerCase() +
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

	function toElements(element) {
		// Support passing things without the first wrapping array
		if (arguments.length > 0)
			element = Array.create(arguments);
		// toElement can either return a single DomElement or a DomElements array.
		var result = element && (element.toElement && element.toElement() || DomElement.get(element)) || null;
		return {
			result: result,
			// Make sure it's always an array, for single handling in inserters below
			array: result ? (Base.type(result) == 'array' ? result : [result]) : [],
			created: result && Base.type(element) != 'element'
		};
	}

	// Now add the various inserters

	// Important: The inseters return this if the object passed is already an 
	// element. But if it is a string or an array that is converted to an element,
	// the newly created element is returned instead.

	Base.each(inserters, function(inserter, name) {
		var part = name.capitalize();
		// #insert* acts like the dom #insert* functions, inserting this element
		// into the passed element(s).
		fields['insert' + part] = function(el) {
			el = toElements.apply(this, arguments);
			var dests = el.array;
			// Clone the object for every index other than the first
			// as we're inserting into multiple times.
			for (var i = 0, l = dests.length; i < l; i++)
				inserter(i == 0 ? this : this.clone(true), dests[i]);
			return el.created ? el.result : this;
		}

		// #inject* does the reverse of #insert*, it injects the passed element(s)
		// into this element.
		fields['inject' + part] = function(el) {
			el = toElements.apply(this, arguments);
			var sources = el.array;
			for (var i = 0, l = sources.length; i < l; i++)
				inserter(sources[i], this);
			return el.created ? el.result : this;
		}
	});

	return fields;
});

#endif // __browser_dom_DomElement__
