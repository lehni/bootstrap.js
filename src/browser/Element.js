#ifndef __browser_Element__
#define __browser_Element__

/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */

////////////////////////////////////////////////////////////////////////////////
// Elements

/**
 * Elements extends inject so that each of the functions
 * defined bellow are executed on the whole set of elements, and the
 * returned values are collected in an array and converted to a Elements
 * array again, if it contains only html elements.
 */
Elements = Object.extend({
	$constructor: function(els, convert) {
		// [].inject(this.__proto__) creates the enriched collection array.
		return (convert && els ? els : $A(els)).inject(this.__proto__);
	},

	$static: {
		inject: function(src) {
			// Iterate through all the values in src and add a closure to
			// functions that calls the function on each of the collection's
			// elements:
			// Call the overriden Hash.inject, to add the enhanced functions.
			// src can either be a function to be called, or a object literal.
			return this.$super((typeof src == 'function' ? src() : src).each(function(val, i) {
				this[i] = typeof val != 'function' ? val : function() {
					var args = arguments, values = [], els = true;
					this.each(function(obj, i) {
						var ret = val.apply(obj, args);
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

// TODO: right now, filter is only applied when el is a string.

function $(el, filter) {
	if (el) {
		if (el._extended || [window, document].contains(el))
			return el;
		if (typeof(el) == 'string')
			el = ($(filter) || document).getElementById(el);
		if ($typeof(el) == 'element' && el.tagName) {
			if (!el.__proto__) Garbage.collect(el);
			if (!el.inject) el.inject = Object.prototype.inject;
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
			// now we inject additional methods depending on the tag of the element
			// as defined above. If nothing is defined, this does not do anything.
			el.inject(Element.tags[el.getTag()]);
			el._extended = true;
			return el;
		}
	}
};

// getElementsBySelector
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

// getElementsBySelector, return first element
function $E(sel, filter) {
	return $$(sel, filter)[0];
};

Element = Object.extend(function() {
	return {
		$constructor: function(el) {
			if (typeof(el) == 'string') el = document.createElement(el);
			return $(el);
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

	return {
		// tells $typeof the type to return when encountering an element,
		// and $() to not inject Element functions into elements that already
		// have them:
		_type: 'element',

		getElementsBySelector: function(selector) {
			var res = new Elements();
			selector.split(',').each(function(sel) {
				var els = null;
				sel.clean().split(' ').each(function(sel, i) {
					// Mac IE does not support (?:), so live without it here:
					// Allow * in classnames, as a wildcard which is later replaced by .*
					
					//                     1         3           4                     6           8                 9
					//                     tag       id          class                 attr. name  attr. operator    attr. value
					//var ps = sel.match(/^(\w*|\*)(#([\w_-]+)|\.([\*\w_-]+))?(\[["\']?(\w+)["\']?(([\*\^\$]?=)["\']?(\w*)["\']?)?\])?$/);
					
					//                   1         3           4               6      8              9
					//                   tag       id          class           a.name attr. operator attr. value
					
					var param;
					if (cache[sel]) param = cache[sel].param;
					else {
						param = sel.match(/^(\w*|\*)(#([\w_-]+)|\.([\*\w_-]+))?(\[(\w+)(([!*^$]?=)["']?([^"'\]]*)["']?)?\])?$/);
						param[1] = param[1] || '*';
						cache[sel] = { param: param };
					}
					if (!param) return;
					if (i == 0) { // fill in els accordingly
						if (param[3]) {
							var el = this.getElementById(param[3]);
							if (!el || param[1] != '*' && Element.prototype.getTag.call(el) != param[1]) throw $break;
							els = [el];
						} else {
							els = $A(this.getElementsByTagName(param[1]));
						}
					} else { // filter
						els = els.each(function(val) {
							this.append(val.getElementsByTagName(param[1]))
						}, []);
						if (param[3]) els = els.filter(function(el) {
							return (el.id == param[3]);
						});
					}
					// replace wildcard (*) with regexp (.*)
					if (param[4]) els = els.filter(function(el) {
						return Element.prototype.hasClass.call(el, param[4].replace('*', '.*'));
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
				if (els) res.include(els);
			}, this);
			return res;
		},

		getElementById: function(id) {
			var el = document.getElementById(id);
			if (el)
				for (var par = el.parentNode; el && par != this; par = parent.parentNode)
					if (!par) el = null;
			return el;
		},

		getElements: function() {
			return $$('*', this);
		},

		injectBefore: function(el) {
			el = element(el);
			el.parentNode.insertBefore(this, el);
			return this;
		},

		injectAfter: function(el) {
			el = element(el);
			var next = el.getNext();
			if (!next) el.parentNode.appendChild(this);
			else el.parentNode.insertBefore(this, next);
			return this;
		},

		injectInside: function(el) {
			element(el).appendChild(this);
			return this;
		},

		append: function(el) {
			this.appendChild(element(el));
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

		appendText: function(text) {
			if (Browser.IE) {
				switch(this.getTag()) {
					case 'style': this.styleSheet.cssText = text; return this;
					case 'script': this.setProperty('text', text); return this;
				}
			}
			this.appendChild(document.createTextNode(text));
			return this;
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
			return walk(this, 'nextSibling', 'lastChild');
		},

		getParent: function() {
			return $(this.parentNode);
		},

		getChildren: function() {
			return $$(this.childNodes);
		},

		hasChild: function(el) {
			return $A(this.getElementsByTagName('*')).contains(el);
		},

		getTag: function() {
			return this.tagName.toLowerCase();
		},

		getProperty: function(name) {
			return (name == 'class') ? this.className : this.getAttribute(name);
		},

		setProperty: function(prop, value) {
			switch (prop) {
				case 'class': this.className = value; break;
				case 'style': if (this.setStyle) this.setStyle(value); break;
				/* TODO: needed?
				case 'name':
					if (Browser.IE6) {
						var el = new Element('<' + this.getTag() + ' name="' + value + '" />');
						['value', 'id', 'className', 'style'].each(function(attr) {
							el[attr] = this[attr];
						});
						if (this.parentNode) this.replaceWith(el);
						return el;
					}
				*/
				default: this.setAttribute(prop, value);
			}
			return this;
		},

		setProperties: function(src) {
			return src.each(function(val, name) {
				this.setAttribute(name, val);
			}, this);
		},

		getHtml: function(html) {
			return this.innerHTML;
		},

		setHtml: function(html) {
			this.innerHTML = $A(arguments).join('');
			return this;
		}
	}
});

// Define functions for additional tags (form elements).
// $() injects these into the given elements based on their tagNames:
Element.tags = (function() {
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

		input: {
			getValue: function() {
				if (this.checked && /checkbox|radio/.test(this.type) ||
					/hidden|text|password/.test(this.type))
					return this.value;
			}			
		}.inject(formElement),

		select: {
			getValue: function() {
				if (this.selectedIndex != -1)
					return this.options[this.selectedIndex].value;
			}
		}.inject(formElement),

		textarea: {
			getValue: function() {
				return this.value;
			}
		}.inject(formElement)
	};
})();

document.getElementsBySelector = Element.prototype.getElementsBySelector;

#endif // __browser_Element__
