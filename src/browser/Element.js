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
					var args = arguments, values = [], els = true;
					this.each(function(obj) {
						// Try to use original method if it's there, in order
						// to support $super, as this will be the wrapper that
						// sets it
						var ret = (obj[key] || val).apply(obj, args);
						values.push(ret);
						if ($typeof(ret) != 'element') els = false;
					});
					return els ? new Elements(values, true) : values;
				}
			}, {}));
		}
	}
});

////////////////////////////////////////////////////////////////////////////////
// Element

// TODO: Right now, filter is only applied when el is a string.
function $(el, filter) {
	if (el) {
		if (el.data || el == window || el == document)
			return el;
		if (typeof(el) == 'string')
			el = ($(filter) || document).getElementById(el);
		if ($typeof(el) == 'element' && el.tagName) {
			Garbage.collect(el);
#ifdef BROWSER_LEGACY
			// TODO: Transition
			if (!el.inject)
				el.inject = Object.prototype.inject;
#endif
			// This is pretty nifty: We do not even need to know how all the
			// different browsers call their HTML Elements (DOMElement on
			// Safari, HTMLElement on Firefox, etc), just look at __proto__
			// here and try to inject in it. if _type is set the next time,
			// the prototype is inhanced. as a fallback, we enhance each
			// single object.
			// Use el.inject as a shortcut to Object.prototype.inject;
			// On Opera, el.__proto__ == Object.prototype, so check against that
			// too:
			if (!el._type) el.inject.call(el.__proto__ && el.__proto__ != Object.prototype ? el.__proto__ : el, Element.prototype);
			// Now we inject additional methods depending on the tag of the element
			// as defined above. If nothing is defined, this does not do anything.
			// el.data is where we store all the additional values, to be cleared
			// for garbage collection in the end. It is also used as an indicator
			// for wether the object was already wrapped before or not.
			// We need to keep a reference to the injected tag fields for garbage
			// collection in the end.
			el.data = { tags: Element.Tags[el.getTag()] };
			return el.inject(el.data.tags);
		}
	}
};

// Short-cut to getElementsBySelector
// TODO: Right now, filter is only applied when el is a string.
function $$(sel, filter) {
	switch ($typeof(sel)) {
	case 'element': return new Elements($(sel));
	case 'string': sel = ($(filter) || document).getElementsBySelector(sel);
	}
	// use $each as sel might be array-like (ElementList)
	return $each(sel || [], function(el) {
		if (el = $(el)) this.push(el);
	}, new Elements());
};

// Short-cut to getElementsBySelector, return first element
function $E(sel, filter) {
	return $$(sel, filter)[0];
};

Element = Base.extend(function() {
	return {
		$constructor: function(el, props) {
			if (typeof(el) == 'string') {
				if (Browser.IE && props && (props.name || props.type)) {
					el = '<' + el + (props.name ? ' name="' + props.name + '"' : '')
						+ (props.type ? ' type="' + props.type + '"' : '') + '>';
					// TODO: needed?
					delete props.name;
					delete props.type;
				}
				el = document.createElement(el);
			}
			el = $(el);
			return (!props || !el) ? el : el.set(props);
		},

		$static: {
			inject: function(src) {
				// inject not only into this, but also into the Elements collection
				// where the functions are "multiplied" for each of the elements
				// of the collection.
				Elements.inject(src);
				return this.$super(src);
			}
		}
	}
});

Element.inject(function() {
	function element(el) {
		return el ? $(el) || new Element(el) : null;
	}

	function walk(that, name, start) {
		var el = that[start ? start : name];
		while (el && $typeof(el) != 'element') el = el[name];
		return $(el);
	}

	var cache = {};

	// Html to JS property mappings, as used by getProperty, setProperty
	// and removeProperty.
	var properties = {
		'class': 'className', 'for': 'htmlFor', colspan: 'colSpan',
		rowspan: 'rowSpan', accesskey: 'accessKey', tabindex: 'tabIndex',
		maxlength: 'maxLength', readonly: 'readOnly', value: 'value',
		disabled: 'disabled', checked: 'checked', multiple: 'multiple'
	};

	return {
		// tells $typeof the type to return when encountering an element,
		// and $() to not inject Element functions into elements that already
		// have them:
		_type: 'element',

		set: function(props) {
			return EACH(props, function(val, key) {
				var set = this['set' + key.capitalize()];
				if (set) set.call(this, val);
				else this.setProperty(key, val);
			}, this);
		},

		getElementsBySelector: function(selector) {
			var res = new Elements();
			(typeof selector == 'string' ? selector.split(',') : selector).each(function(sel) {
				var els = null;
				sel.clean().split(' ').each(function(sel, i) {
					// Cache selector parsing results:
					var param;
					if (cache[sel]) param = cache[sel].param;
					else {
						// Mac IE does not support (?:), so live without it here:
						// Allow * in classnames, as a wildcard which is later replaced by .*
						//                  1         3           4               6      8             9
						//                  tag       id          class           a.name attr.operator attr.value
						param = sel.match(/^(\w*|\*)(#([\w_-]+)|\.([\*\w_-]+))?(\[(\w+)(([!*^$]?=)["']?([^"'\]]*)["']?)?\])?$/);
						param[1] = param[1] || '*';
						cache[sel] = { param: param };
					}
					if (!param) return;
					if (i == 0) { // Fill in els accordingly
						if (param[3]) {
							var el = this.getElementById(param[3]);
							if (!el || param[1] != '*' && Element.prototype.getTag.call(el) != param[1]) throw $break;
							els = [el];
						} else {
							els = $A(this.getElementsByTagName(param[1]));
						}
					} else { // Filter
						els = els.each(function(val) {
							this.append(val.getElementsByTagName(param[1]))
						}, []);
						if (param[3]) els = els.filter(function(el) {
							return (el.id == param[3]);
						});
					}
					if (param[4]) els = els.filter(function(el) {
						//return el.className.test('(^|\\s*)' + param[4] + '(\\s*|$)');
						return Element.prototype.hasClass.call(el, param[4]);
					});
					if (param[6]) els = els.filter(function(name, value, operator) {
						var att = this.getProperty(param[6]), value = param[9], operator = param[8];
						if (att) return !operator ||
					 		operator == '=' && att == value ||
							operator == '*=' && att.test(value) ||
							operator == '^=' && att.test('^' + value) ||
							operator == '$=' && att.test(value + '$') ||
							operator == '!=' && att != value;
					});
				}, this);
				// Wrap the elements and add them, but only if they were not aded already
				$each(els, function(el) {
					if (this.indexOf(el = $(el)) == -1) this.push(el);
				}, res);
			}, this);
			return res;
		},

		getElementById: function(id) {
			var el = document.getElementById(id);
			if (el)
				for (var par = el.parentNode; el && par != this; par = par.parentNode)
					if (!par) el = null;
			return el;
		},

		getElements: function() {
			return $$('*', this);
		},

		append: function(el) {
			this.appendChild(element(el));
			return this;
		},

		appendBefore: function(el) {
			el = element(el);
			el.parentNode.insertBefore(this, el);
			return this;
		},

		appendAfter: function(el) {
			el = element(el);
			var next = el.getNext();
			if (!next) el.parentNode.appendChild(this);
			else el.parentNode.insertBefore(this, next);
			return this;
		},

		appendTop: function(el) {
			if (el.firstChild)
				el.insertBefore(this, el.firstChild);
			return this;
		},

		appendInside: function(el) {
			element(el).appendChild(this);
			return this;
		},

		appendText: function(text) {
			if (Browser.IE) {
				switch (this.getTag()) {
				case 'style': this.styleSheet.cssText = text; return this;
				case 'script': this.setProperty('text', text); return this;
				}
			}
			this.appendChild(document.createTextNode(text));
			return this;
		},

		remove: function() {
			this.parentNode.removeChild(this);
			return this;
		},

		clone: function(contents) {
			return $(this.cloneNode(contents !== false));
		},

		replaceWith: function(el) {
			el = element(el);
			this.parentNode.replaceChild(el, this);
			return el;
		},

		hasClass: function(name) {
			return this.className.test('(^|\\s*)' + name + '(\\s*|$)');
		},

		modifyClass: function(name, add) {
			if (!this.hasClass(name) ^ !add) // xor
				this.className = (add ? this.className + ' ' + name : 
					this.className.replace(name, '')).clean();
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
			return walk(this, 'previousSibling');
		},

		getNext: function() {
			return walk(this, 'nextSibling');
		},

		getFirst: function() {
			return walk(this, 'nextSibling', 'firstChild');
		},

		getLast: function() {
			return walk(this, 'previousSibling', 'lastChild');
		},

		getParent: function() {
			return $(this.parentNode);
		},

		getChildren: function() {
			return $$(this.childNodes);
		},

		hasChild: function(el) {
			return $A(this.getElementsByTagName('*')).indexOf(el) != -1;
		},

		getTag: function() {
			return this.tagName.toLowerCase();
		},

		getProperty: function(name) {
			var index = properties[name];
			return (index) ? this[index] : this.getAttribute(name);
		},

		removeProperty: function(name) {
			var index = properties[name];
			if (index) this[index] = '';
			else this.removeAttribute(name);
			return this;
		},

		setProperty: function(name, value) {
			var index = properties[name];
			if (index) this[index] = value;
			else this.setAttribute(name, value);
			return this;
		},

		setProperties: function(src) {
			return EACH(src, function(val, name) {
				this.setAttribute(name, val);
			}, this);
		},

		getHtml: function() {
			return this.innerHTML;
		},

		setHtml: function(html) {
			this.innerHTML = html;
			return this;
		}
	}
});

document.getElementsBySelector = Element.prototype.getElementsBySelector;

// Define functions for additional tag types (form elements).
// $() injects these into the given elements based on their tagNames:
Element.Tags = (function() {
	// Methods common in input, select and textarea:
	var formElement = {
		enable: function(enable) {
			var disable = !enable && enable !== undefined;
			if (disable) this.blur();
			this.disabled = disable;
		}
	};

	return {
		form: {
			getElements: function() {
				return $$('input, select, textarea', this);
			},

			blur: function() {
				this.getElements().each(function(el) {
					el.blur();
				});
			},

			enable: function(enable) {
				this.getElements().each(function(el) {
					el.enable(enable);
				});
			}
		},

		input: $H({
			getValue: function() {
				if (this.checked && /checkbox|radio/.test(this.type) ||
					/^(hidden|text|password)$/.test(this.type))
					return this.value;
			}
		}, formElement),

		select: $H({
			getValue: function() {
				if (this.selectedIndex != -1)
					return this.options[this.selectedIndex].value;
			},

			add: function(opt) {
				this.options[this.options.length] = $typeof(obj) == 'object' ? opt
						: new Option(opt);
			},

			clear: function() {
				this.selectedIndex = -1;
				this.options.length = 0;
			}
		}, formElement),

		textarea: $H({
			getValue: function() {
				return this.value;
			}
		}, formElement)
	};
})();

#endif // __browser_Element__
