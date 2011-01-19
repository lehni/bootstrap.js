#ifndef __browser_dom_DomNode__
#define __browser_dom_DomNode__

////////////////////////////////////////////////////////////////////////////////
// DomNodes

/**
 * DomNodes extends inject so that each of the functions
 * defined bellow are executed on the whole set of nodes, and the
 * returned values are collected in an array and converted to a DomNodes
 * array again, if it contains only nodes.
 */
DomNodes = Array.extend(new function() {
	var unique = 0;
	
	return {
		initialize: function(nodes) {
			// Define this collections's unique ID. Nodes that are added to it
			// get that field set too, in order to detect multiple additions of
			// nodes in one go. Notice that this does not work when nodes
			// are added to another collection, then again to this one.
			// But for Dom Query functions, this is enough.
			this._unique = unique++;
			// Do not use nodes.push to detect arrays, as we're passing pseudo
			// arrays here too (e.g. childNodes). But the native Option defines
			// .length too, so rule that out by checking nodeType as well.
			this.append(nodes && nodes.length != null && !nodes.nodeType
				? nodes : arguments);
		},

		/**
		 * Only #push wraps the added node in a DomNode. splice and unshift
		 * are NOT overridden to do the same.
		 */
		push: function() {
			this.append(arguments);
			return this.length;
		},

		append: function(items) {
			for (var i = 0, l = items.length; i < l; i++) {
				var el = items[i];
				// Try _wrapper first, for faster performance
				if ((el = el && (el._wrapper || DomNode.wrap(el))) && el._unique != this._unique) {
					el._unique = this._unique;
					this[this.length++] = el;
				}
			}
			return this;
		},

		toNode: function() {
			// return the DomNodes array itself. See inserters comments further bellow
			return this;
		},

		statics: {
			inject: function(src/*, ... */) {
				// For each function that is injected into DomNodes, create a
				// new function that iterates that calls the function on each of
				// the collection's nodes.
				// src can either be a function to be called, or a object literal.
				var proto = this.prototype;
				this.base(Base.each(src || {}, function(val, key) {
					if (typeof val == 'function') {
						var func = val, prev = proto[key];
						var count = func.length, prevCount = prev && prev.length;
						val = function() {
							var args = arguments, values;
							// If there was a previous implementation under this name
							// and the arguments match better, use that one instead.
							// The strategy is very basic: If the same amount of arguments
							// are provided as the previous one accepts, or if more arguments
							// are provided than the new function can handle and the previous
							// implementation expects more, use the previous one instead.
							if (prev && args.length == prevCount
								|| (args.length > count && args.length <= prevCount))
								return prev.apply(this, args);
							this.each(function(obj) {
								// Try to use original method if it's there, in order
								// to support base, as this will be the wrapper that
								// sets it
								var ret = (obj[key] || func).apply(obj, args);
								// Only collect return values if defined and not
								// returning 'this'.
								if (ret !== undefined && ret != obj) {
									values = values || (DomNode.isNode(ret)
										? new obj._collection() : []);
									values.push(ret);
								}
							});
							return values || this;
						}
					}
					this[key] = val;
				}, {}));
				for (var i = 1, l = arguments.length; i < l; i++)
					this.inject(arguments[i]);
				return this;
			}
		}
	};
});

////////////////////////////////////////////////////////////////////////////////
// DomNode

DomNode = Base.extend(new function() {
	var nodes = [];
	// LUTs for tags and class based constructors. Bootstrap can automatically
	// use sub-prototype of DomNode for any given wrapped node based on
	// its className Attribute. The sub-prototype only needs to define _class
	var tags = {}, classes = {}, classCheck, unique = 0;

	// Garbage collection - uncache nodes/purge listeners on orphaned nodes
	// so we don't hold a reference and cause the browser to retain them.
	function dispose(force) {
		for (var i = nodes.length - 1; i >= 0; i--) {
			var el = nodes[i];
			if (force || (!el || el != window && el != document &&
				(!el.parentNode || !el.offsetParent))) {
				if (el) {
					var obj = el._wrapper;
					if (obj && obj.finalize) obj.finalize();
					el._wrapper = el._unique = null;
				}
				if (!force) nodes.splice(i, 1);
			}
		}
	}
	// TODO: this seems to cause problems. Turn off for now.
	// dispose.periodic(30000);

	// Private inject function for DomNode. It adds support for
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
			// get/setProperty() expects lowercase property name.
			var part = name.capitalize(), prop = name.toLowerCase();
			src['get' + part] = function() {
				return this.getProperty(prop);
			}
			src['set' + part] = function(value) {
				return this.setProperty(prop, value);
			}
		});
		delete src._methods;
		delete src._properties;
		return Function.inject.call(this, src);
	}

	function getConstructor(el) {
		// Use DomNode as as the default, HtmlElement for anything with
		// className !== undefined and special constructors based on tag names.
		// tags stores both upper-case and lower-case references for higher
		// speed.
		// classCheck only exists if HtmlElement was extended with prototypes
		// defining _class. In this case, classCheck is a regular expression that
		// checks className for the occurence of any of the prototype mapped
		// classes, and returns the first occurence, which is then used to
		// decide for constructor. This allows using e.g. "window hidden" for
		// an element that should map to a window prototype.
		var match;
		// Check classCheck first, since it can override the _tag setting
		return classCheck && el.className && (match = el.className.match(classCheck)) && match[2] && classes[match[2]] ||
			// Check _tag settings for extended HtmlElement prototypes bound to tagNames, e.g. HtmlForm, etc.
			el.tagName && tags[el.tagName] ||
			// Html elements
			el.className !== undefined && HtmlElement ||
			// Elements
			el.nodeType == 1 && DomElement ||
			// TextNodes
			el.nodeType == 3 && DomTextNode ||
			// Documents
			el.nodeType == 9 && (el.documentElement.nodeName.toLowerCase() == 'html' && HtmlDocument || DomDocument) ||
			// Windows
			el.location && el.frames && el.history && DomWindow ||
			// Everything else
			DomNode;
	}

	var dont = {};

	return {
		BEANS_TRUE
		// Tells Base.type the type to return when encountering an node.
		_type: 'node',
		_collection: DomNodes,
		// Tell extend to automatically call this.base in overridden initialize
		// methods of DomNodes
		// See extend bellow for more information about this.
		_initialize: true,

		initialize: function(el, props, doc) {
			if (!el) return null;
			// Support node creating constructors on subclasses of DomNode
			// that define prototype._tag and can take one argument, which
			// defines the properties to be set:
			if (this._tag && Base.type(el) == 'object') {
				props = el;
				el = this._tag;
			}
			// doc is only used when producing an node from a string.
			if (typeof(el) == 'string') {
				// Call the internal element creation helper. This does not fully
				// set props, only the one needed for the IE workaround.
				// Set(props) is called further bellow.
				el = DomElement.create(el, props, doc);
			} else if (el._wrapper) {
				// Does the DomNode wrapper for this node already exist?
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
			// Store a reference to the native node.
			this.$ = el;
			// Store a reference in the native node to the wrapper.
			// Needs to be cleaned up by garbage collection. See above.
			// Not all nodes allow setting of values. E.g. on IE, textnodes don't
			// For now we just ingore them and do not store the wrapper.
			try {
				el._wrapper = this;
				nodes[nodes.length] = el;
			} catch (e) {} // Ignore error
			if (props) this.set(props);
		},

		statics: {
			inject: function(src/*, ... */) {
				if (src) {
					// Produce generic-versions for each of the injected
					// non-static methods, so that they function on native
					// methods instead of wrapped ones. This means
					// DomNode.getProperty(el, name) can be called on non
					// wrapped nodes.
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
					// _collection (it would not return a string but an array then).
					delete src.toString;
					// Now, after src was processed in #inject, inject not only
					// into this, but also into DomNodes where the functions
					// are "multiplied" for each of the nodes of the collection.
					proto._collection.inject(src);
				}
				for (var i = 1, l = arguments.length; i < l; i++)
					this.inject(arguments[i]);
				return this;
			},

			extend: function(src) {
				// Do not pass src to base, as we weed to fix #inject first.
				var ret = this.base();
				// If initialize is defined, explicitely calls this.base(el, props)
				// here. This is a specialy DomNode extension that does not
				// require the user to call this.base(), since it is used for _class
				// stuff often.
				var init = src.initialize;
				if (init) src.initialize = function(el, props) {
					var ret = this._initialize && this.base(el, props);
					if (ret) return ret;
					init.apply(this, arguments);
				}
				inject.call(ret, src);
				// Undo overriding of the inject method above for subclasses that
				// do not define a different _collection value, as only injecting
				// into DomNode (not subclasses) shall also inject into DomNodes!
				// Reseting before does not work, as it would be overridden
				// during static inheritance again.
				if (ret.prototype._collection == this.prototype._collection)
					ret.inject = inject;
				// When extending DomNode with a tag name field specified, this
				// prototype will be used when wrapping nodes of that type.
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
						// these nodes on domready, so that initialize will be
						// directly called and further dom manipulation can be done.
						if (!src._lazy && src.initialize) Browser.document.addEvent('domready', function() {
							this.getElements('.' + src._class);
						});
					}
				}
				return ret;
			},

			/**
			 * Wraps the passed node in a DomNode wrapper.
			 * It returns existing wrappers through el._wrapper, if defined.
			 */
			wrap: function(el) {
				return el ? typeof el == 'string' // selector?
					? DomElement.get(el)
					// Make sure we're using the right constructor.
					: el._wrapper || el._collection && el || new (getConstructor(el))(el, dont)
						: null;
			},

			/**
			 * Unwraps a wrapped node and returns its native dom node, or
			 * the node itself if it is already native.
			 */
			unwrap: function(el) {
				return el && el.$ || el;
			},

			unique: function(el) {
				if (!el._unique) {
					nodes.push(el);
					el._unique = ++unique;
				}
			},

			isNode: function(obj) {
				return /^(element|node|textnode|document)$/.test(
					typeof obj == 'string' ? obj : Base.type(obj));
			},

			dispose: function() {
				dispose(true);
			}
		}
	}
});

// Use the modified inject function from above which injects both into DomNode
// and DomNodes.
DomNode.inject(new function() {
	// Dom / Html to JS property mappings, as used by getProperty, setProperty
	// and removeProperty.
	var bools = ['compact', 'nowrap', 'ismap', 'declare', 'noshade', 'checked',
		'disabled', 'readonly', 'multiple', 'selected', 'noresize', 'defer'
	].associate();
	var properties = Hash.append({ // props
		text: Browser.TRIDENT || Browser.WEBKIT && Browser.VERSION < 420 || Browser.PRESTO && Browser.VERSION < 9
			? function(node) {
				return node.$.innerText !== undefined ? 'innerText' : 'nodeValue'
			} : 'textContent',
		// Make sure that setting both class and className uses this.$.className instead of setAttribute
		html: 'innerHTML', 'class': 'className', className: 'className', 'for': 'htmlFor'
	}, [ // camels and other values that need to be accessed directly, not through getAttribute
		'value', 'accessKey', 'cellPadding', 'cellSpacing', 'colSpan',
		'frameBorder', 'maxLength', 'readOnly', 'rowSpan', 'tabIndex',
		'selectedIndex', 'useMap', 'width', 'height'
	].associate(function(name) {
		return name.toLowerCase();
	}), bools);

	// Values to manually copy over when cloning with content
	var clones = { input: 'checked', option: 'selected', textarea: Browser.WEBKIT && Browser.VERSION < 420 ? 'innerHTML' : 'value' };

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
		return fn
			? fn[Base.type(value) == 'array' ? 'apply' : 'call'](that, value)
			: that[prefix + 'Property'](name, value);
	}

	// A helper for calling toNode and returning results.
	function toNodes(elements) {
		// Support passing things as argument lists, without the first wrapping array
		// Do not reset elements, since this causes a circular reference on Opera
		// where arguments inherits from array and therefore is returned umodified
		// by Array.create, and where setting elements to a new value modifies
		// this arguments list directly.
		var els = Base.type(elements) == 'array' ? elements : Array.create(arguments);
		// Find out if elements are created, or if they were already passed.
		// The convention is to return the newly created elements if they are not
		// elements already, otherwise return this.
		var created = els.find(function(el) {
			return !DomNode.isNode(el);
		});
		// toNode can either return a single DomElement or a DomElements array.
		var result = els.toNode(this.getDocument());
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
		BEANS_TRUE
		_properties: ['text'],

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

		getDocument: function() {
			return DomNode.wrap(this.$.ownerDocument);
		},

		getWindow: function() {
			return this.getDocument().getWindow();
		},

		getPreviousNode: function() {
			return DomNode.wrap(this.$.previousSibling);
		},

		getNextNode: function() {
			return DomNode.wrap(this.$.nextSibling);
		},

		getFirstNode: function() {
			return DomNode.wrap(this.$.firstChild);
		},

		getLastNode: function() {
			return DomNode.wrap(this.$.lastChild);
		},

		getParentNode: function() {
			return DomNode.wrap(this.$.parentNode);
		},

		// Returns all the Element's children including text nodes
		getChildNodes: function() {
		 	return new DomNodes(this.$.childNodes);
		},

		hasChildNodes: function() {
			return this.$.hasChildNodes();
		},

		appendChild: function(el) {
			if (el = DomNode.wrap(el)) {
				// Fix a bug on Mac IE when inserting Option elements to Select
				// elements, where the text on these objects is lost after insertion
				// -> inserters.before does the same.
				// This appears to still be needed on IE7.
				var text = Browser.TRIDENT && el.$.text;
				if (text) el.$.text = '';
				this.$.appendChild(el.$);
				if (text) el.$.text = text;
			}
			return this;
		},

		appendChildren: function() {
			return Array.flatten(arguments).each(function(el) {
				this.appendChild($(DomNode.wrap(el)));
			}, this);
		},

		appendText: function(text) {
			return this.injectBottom(this.getDocument().createTextNode(text));
		},

		prependText: function(text) {
			return this.injectTop(this.getDocument().createTextNode(text));
		},

		remove: function() {
			if (this.$.parentNode)
				this.$.parentNode.removeChild(this.$);
			return this;
		},

		removeChild: function(el) {
			el = DomNode.wrap(el);
			this.$.removeChild(el.$);
			return el;
		},

		removeChildren: function() {
			var nodes = this.getChildNodes();
			nodes.remove();
			return nodes;
		},

		replaceWith: function(el) {
			if (this.$.parentNode) {
				// Use toNodes to support on the fly creation of one or more
				// elements to replace with:
				el = toNodes.apply(this, arguments);
				var els = el.array;
				// Replace the first item of the array and insert all the others
				// afterwards, if there are more than one:
				if (els.length > 0)
					this.$.parentNode.replaceChild(els[0].$, this.$);
				for (var i = els.length - 1; i > 0; i--)
					els[i].insertAfter(els[0]);
				return el.result;
			}
			return null;
		},

		/**
		 * Wraps the passed elements around the current one.
		 * Elements are converted through toNodes
		 *
		 * Inspired by: jQuery
		 */
		wrap: function() {
			var el = this.injectBefore.apply(this, arguments), last;
			do {
				last = el;
				el = el.getFirst();
			} while(el);
			last.appendChild(this);
			return last;
		},

		clone: function(contents) {
			var clone = this.$.cloneNode(!!contents);
			function clean(left, right) {
				if (Browser.TRIDENT) {
					left.clearAttributes();
					left.mergeAttributes(right);
					left.removeAttribute('_wrapper');
					left.removeAttribute('_unique');
					if (left.options)
						for (var l = left.options, r = right.options, i = l.length; i--;)
							l[i].selected = r[i].selected;
				}
				var name = clones[right.tagName.toLowerCase()];
				if (name && right[name])
					left[name] = right[name];
				if (contents)
					for (var l = left.childNodes, r = right.childNodes, i = l.length; i--;)
						clean(l[i], r[i]);
			}
			clean(clone, this.$);
			return DomNode.wrap(clone);
		},

		getProperty: function(name) {
			var key = properties[name], value;
			// Support key branching through functions, as needed by 'text' on IE
			key = key && typeof key == 'function' ? key(this) : key;
			var value = key ? this.$[key] : this.$.getAttribute(name);
			return bools[name] ? !!value : value;
		},

		setProperty: function(name, value) {
			var key = properties[name], defined = value !== undefined;
			key = key && typeof key == 'function' ? key(this) : key;
			if (key && bools[name]) value = value || !defined ? true : false;
			else if (!defined) return this.removeProperty(name);
			key ? this.$[key] = value : this.$.setAttribute(name, value);
			return this;
		},

		removeProperty: function(name) {
			var key = properties[name], bool = key && bools[name];
			key = key && typeof key == 'function' ? key(this) : key;
			key ? this.$[key] = bool ? false : '' : this.$.removeAttribute(name);
			return this;
		},

		getProperties: function() {
			var props = {};
			for (var i = 0; i < arguments.length; i++)
				props[arguments[i]] = this.getProperty(arguments[i]);
			return props;
		},

		setProperties: function(src) {
			return Base.each(src, function(value, name) {
				this.setProperty(name, value);
			}, this);
		},

		removeProperties: function() {
			return Array.each(arguments, this.removeProperty, this);
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
				// Fix a bug on Mac IE when inserting Option elements to Select
				// elements, where the text on these objects is lost after insertion.
				// -> DomNode#appendChild does the same.
				var text = Browser.TRIDENT && dest.$.text;
				if (text) dest.$.text = '';
				dest.$.parentNode.insertBefore(source.$, dest.$);
				if (text) dest.$.text = text;
			}
		},

		/**
		 * Inserts the source element after the dest element in the DOM.
		 */
		after: function(source, dest) {
			if (source && dest && dest.$.parentNode) {
				var next = dest.$.nextSibling;
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
				var first = dest.$.firstChild;
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
			el = toNodes.apply(this, arguments);
			// Clone the object for every index other than the first
			// as we're inserting into multiple times.
			for (var i = 0, list = el.array, l = list.length; i < l; i++)
				inserter(i == 0 ? this : this.clone(true), list[i]);
			return el.result || this;
		}

		// #inject* does the reverse of #insert*, it injects the passed element(s)
		// into this element.
		fields['inject' + part] = function(el) {
			el = toNodes.apply(this, arguments);
			for (var i = 0, list = el.array, l = list.length; i < l; i++)
				inserter(list[i], this);
			return el.result || this;
		}
	});

	return fields;
});

#endif // __browser_dom_DomNode__
