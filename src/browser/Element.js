#ifndef __browser_Element__
#define __browser_Element__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif

////////////////////////////////////////////////////////////////////////////////
// Elements

/**
 * Elements extends inject so that each of the functions
 * defined bellow are executed on the whole set of elements, and the
 * returned values are collected in an array and converted to a Elements
 * array again, if it contains only html elements.
 */
Elements = Base.extend({
	$constructor: function(els, convert) {
		// [].inject(this.__proto__) creates the enriched collection array.
		// TODO: Transition
		return (convert && els ? els : $A(els)).inject(this.__proto__);
	},

	$static: {
		inject: function(src) {
			// For reach function that is injected into Elements, create a new
			// function that iterates that calls the function on each of the
			// collection's elements.
			// src can either be a function to be called, or a object literal.
			return this.$super(EACH((typeof src == 'function' ? src() : src), function(val, key) {
				this[key] = typeof val != 'function' ? val : function() {
					// Only collect values if calling a getter function, otherwise
					// return this
					var args = arguments, values = /^get/.test(key) && [], els = true;
					this.each(function(obj) {
						// Try to use original method if it's there, in order
						// to support $super, as this will be the wrapper that
						// sets it
						var ret = (obj[key] || val).apply(obj, args);
						if (values) {
							values.push(ret);
							els = els && $typeof(ret) == 'element';
						}
					});
					return values ? (els ? new Elements(values, true) : values) : this;
				}
			}, {}));
		}
	}
});

////////////////////////////////////////////////////////////////////////////////
// Element

Element = Base.extend(function() {
	var cache = {}, tags = {}, uniqueId = 0;

	return {
		$constructor: function(el, props) {
			// Support element creating constructors on subclasses of Element
			// that define prototype.tag and can take one argument, which 
			// defines the properties to be set:
			if (this.tag && /^(object|hash)$/.test($typeof(el))) {
				props = el;
				el = this.tag;
			}
			if (typeof(el) == 'string') {
				if (Browser.IE && props && (props.name || props.type))
					el = '<' + el + (props.name ? ' name="' + props.name + '"' : '')
						+ (props.type ? ' type="' + props.type + '"' : '') + '>';
				el = document.createElement(el);
			}
			var id = el.id;
			// Cache wrappers by their ids
			if(id && cache[id]) return cache[id]; // Element object already exists
			// Make sure we're using the right constructor for this tag
			var ctor = tags[el.tagName.toLowerCase()] || Element;
			if (!(this instanceof ctor)) return new ctor(el, props);
			this.$ = el;
			// Generate ids if the element does not define one
			if (!id) id = el.id = 'bootstrap-' + (++uniqueId);
			this.id = id;
			this.style = el.style;
			if (props) this.set(props);
			// Cache it
			cache[id] = this;
		},

		$static: {
			inject: function(src, hide, base) {
				// Inject not only into this, but also into the Elements collection
				// where the functions are "multiplied" for each of the elements
				// of the collection.
				Elements.inject(src, hide, base);
				return this.$super(src, hide, base);
			},

			extend: function(src, hide) {
				// Do not pass src to $super, as we weed to fix #inject first.
				var ret = this.$super({}, hide);
				// Undo overriding of the inject above for subclasses, as only
				// injecting into Element (not subclasses) shall also inject
				// into Elements!
				ret.inject = Function.inject;
				ret.inject(src, hide, this);
				// When extending Element with a tag field specified, this 
				// prototype will be used when wrapping elements of that type.
				// If this is a prototype for a certain tag, store it in the LUT.
				if (src.tag) tags[src.tag] = ret;
				return ret;
			},

			get: function(el, root) {
				if (typeof(el) == 'string') {
					root = root && Element.unwrap(root);
					if (el.charAt(0) == '#') {
						el = document.getElementById(el.substring(1));
						if (root && !Element.isAncestor(el, root)) el = null;
					} else {
						el = Element.select(el, root, 1)[0];
					}
				}
				return el ? el.id && cache[el.id] || new Element(el) : null;
			},

			unwrap: function(el) {
				return el.nodeType ? el : el.$;
			},

			// TODO: move further down?
			isAncestor: function(el, parent) {
				// TODO: See Ext for a faster implementation
				parent = Element.unwrap(parent);
				if (parent != document)
					for (el = Element.unwrap(el).parentNode; el != parent; el = el.parentNode)
						if (!el) return false;
				return true;
			}
		}
	}
});

// Short-cut to Element.get
$ = Element.get;

// Use the modified inject function from above which injects both into Element
// and Elements.
Element.inject(function() {
	function walk(el, name, start) {
		el = el[start ? start : name];
		while (el && $typeof(el) != 'element') el = el[name];
		return Element.get(el);
	}

	// Html to JS property mappings, as used by getProperty, setProperty
	// and removeProperty.
	var properties = {
		'class': 'className', 'for': 'htmlFor', colspan: 'colSpan',
		rowspan: 'rowSpan', accesskey: 'accessKey', tabindex: 'tabIndex',
		maxlength: 'maxLength', readonly: 'readOnly', value: 'value',
		disabled: 'disabled', checked: 'checked', multiple: 'multiple'
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
			return Element.select(selectors || '*', this);
		},

		getElement: function(selector) {
			return Element.get(selector || '*', this);
		},

		getParents: function(selector) {
			var parents = [];
			for (var el = this.$.parentNode; el; el = el.parentNode)
				parents.push(el);
			return selector && selector != '*'
				? Element.filter(parents, selector, this)
				: parents;
		},

		appendChild: function(el) {
			this.$.appendChild(Element.get(el).$);
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
			el = Element.get(el);
			el.$.parentNode.insertBefore(this.$, el.$);
			return this;
		},

		insertAfter: function(el) {
			el = Element.get(el);
			var next = el.getNext();
			if (!next) el.$.parentNode.appendChild(this.$);
			else el.$.parentNode.insertBefore(this.$, next.$);
			return this;
		},

		insertFirst: function(el) {
			// TODO: See Ext's insertFirst, add support for createChild, return
			// added element instead of this?!
			el = Element.get(el);
			el.$.insertBefore(this.$, el.$.firstChild);
			return this;
		},

		insertInside: function(el) {
			Element.get(el).appendChild(this);
			return this;
		},

		remove: function() {
			this.$.parentNode.removeChild(this.$);
			return this;
		},

		clone: function(contents) {
			return Element.get(this.$.cloneNode(!!contents));
		},

		replaceWith: function(el) {
			el = Element.get(el);
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
			return Element.get(this.$.parentNode);
		},

		getChildren: function() {
			return new Elements(this.$.childNodes);
		},

		hasParent: function(el) {
			return Element.isAncestor(this.$, el);
		},

		hasChild: function(el) {
			return Element.isAncestor(el, this.$);
		},

		getTag: function() {
			return this.$.tagName.toLowerCase();
		},

		getProperty: function(name) {
			var key = properties[name];
			return (key) ? this.$[key] : this.$.getAttribute(name);
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
				this.$.setAttribute(name, val);
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

Form = Element.extend({
	tag: 'form',

	/**
	 * Overrides getElements to only return form elements by default.
	 * Explicitely call with '*' to return all elements contained in this form.
	 */
	getElements: function(selectors) {
		return this.$super(selectors || ['input', 'select', 'textarea']);
	},

	blur: function() {
		this.getElements().each(function(el) {
			el.blur();
		});
		return this;
	},

	enable: function(enable) {
		this.getElements().each(function(el) {
			el.enable(enable);
		});
		return this;
	}
});

FormElement = Element.extend({
	enable: function(enable) {
		var disable = !enable && enable !== undefined;
		if (disable) this.$.blur();
		this.$.disabled = disable;
	},

	focus: function() {
		this.$.focus();
		return this;
	},

	blur: function() {
		this.$.blur();
		return this;
	}
});

Input = FormElement.extend({
	tag: 'input',

	getValue: function() {
		if (this.$.checked && /checkbox|radio/.test(this.$.type) ||
			/^(hidden|text|password)$/.test(this.$.type))
			return this.$.value;
	}
});

Select = FormElement.extend({
	tag: 'select',

	/**
	 * Form Element constructors work in two ways:
	 * - Thew wrap an existing element, in which facse first is the elment
	 *   and second point to the properties to set.
	 * - They create a new element, in which case first point to the properties to set
	 *   and second might be something else, e.g. an array of options for Select.
	 */
	$constructor: function(first, second) {
		var wrapping = $typeof(first) == 'element';
		this.$super(wrapping ? first : second, wrapping ? second : null);
		if (second && !wrapping) this.add.apply(this, second);
		// TODO: redundant? Make native options available just like this.$.style
		this.options = this.$.options;
	},

	getValue: function() {
		if (this.$.selectedIndex != -1)
			return this.$.options[this.$.selectedIndex].value;
	},

	getOptions: function() {
		return this.$.options;
	},

	add: function() {
		EACH(arguments, function(opt) {
			this.$.options[this.$.options.length] = $typeof(opt) == 'object' ? opt
					: new Option(opt);
		}, this);
		return this;
	},

	clear: function() {
		this.$.selectedIndex = -1;
		this.$.options.length = 0;
		return this;
	}
});

TextArea = FormElement.extend({
	tag: 'textarea',

	getValue: function() {
		return this.$.value;
	}
});

#endif // __browser_Element__
