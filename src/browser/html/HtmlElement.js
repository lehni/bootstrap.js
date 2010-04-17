#ifndef __browser_html_HtmlElement__
#define __browser_html_HtmlElement__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif // HIDDEN

#include "../dom/DomElement.js"

////////////////////////////////////////////////////////////////////////////////
// HtmlElements

HtmlElements = DomElements.extend();

////////////////////////////////////////////////////////////////////////////////
// HtmlElement

HtmlElement = DomElement.extend({
	_collection: HtmlElements
});

// Use the modified inject function from above which injects both into HtmlElement
// and HtmlElements.
HtmlElement.inject({
	_BEANS
	_properties: ['html'],

	getClass: function() {
		return this.$.className;
	},

	setClass: function(cls) {
		this.$.className = cls;
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

	hasClass: function(name) {
		return this.$.className.contains(name, ' ');
	}
});

////////////////////////////////////////////////////////////////////////////////
// toNode conversion for Array and String

Array.inject({
	toNode: function(doc) {
		doc = DomNode.wrap(doc || document);
		//	['div', { margin: 10 }, [ // Children
		//		'span', { html: 'hello ' },
		//		'<span>world</span>'
		//	]]
		var elements = new HtmlElements();
		for (var i = 0; i < this.length;) {
			var value = this[i++], element = null, type = Base.type(value);
			if (type == 'string') {
				// If the string is html, convert it through String#toNode.
				// Otherwise assume it's a tag name, and look see the following
				// value is a properties hash. Use these to create the element:
				var props = /^(object|hash)$/.test(Base.type(this[i])) && this[i++];
				element = value.isHtml()
					? value.toNode(doc).set(props)
					: doc.createElement(value, props);
				// See if it has children defined, and add them through Array#toNode
				if (Base.type(this[i]) == 'array')
					element.injectBottom(this[i++].toNode(doc));
			} else if (DomNode.isNode(type)) {
				// Raw nodes / elements
				element = value;
			} else if (value && value.toNode) {
				// Anything else
				element = value.toNode(doc);
			}
			// Append arrays and push single elements.
			if (element)
				elements[Base.type(element) == 'array' ? 'append' : 'push'](element);
		}
		// Unbox if there's only one element in the array
		return elements.length == 1 ? elements[0] : elements;
	}
});

String.inject({
	toNode: function(doc) {
		var doc = doc || document, elements;
		// See if it contains tags. If so, produce nodes, otherwise execute
		// the string as a selector
		if (this.isHtml()) {
			// Html code. Conversion to HtmlElements ported from jQuery
			// Trim whitespace, otherwise indexOf won't work as expected
			var str = this.trim().toLowerCase();
			// doc can be native or wrapped:
			var div = DomElement.unwrap(doc).createElement('div');

			var wrap =
				 // option or optgroup
				!str.indexOf('<opt') &&
				[1, '<select>', '</select>'] ||
				
				!str.indexOf('<leg') &&
				[1, '<fieldset>', '</fieldset>'] ||
				
				(!str.indexOf('<thead') || !str.indexOf('<tbody') || !str.indexOf('<tfoot') || !str.indexOf('<colg')) &&
				[1, '<table>', '</table>'] ||
				
				!str.indexOf('<tr') &&
				[2, '<table><tbody>', '</tbody></table>'] ||
				
			 	// <thead> matched above
				(!str.indexOf('<td') || !str.indexOf('<th')) &&
				[3, '<table><tbody><tr>', '</tr></tbody></table>'] ||
				
				!str.indexOf('<col') &&
				[2, '<table><colgroup>', '</colgroup></table>'] ||
				
				[0,'',''];

			// Go to html and back, then peel off extra wrappers
			div.innerHTML = wrap[1] + this + wrap[2];
			
			// Move to the right depth
			while (wrap[0]--)
				div = div.firstChild;
			
			// Remove IE's autoinserted <tbody> from table fragments
			if (Browser.TRIDENT) {
				var els = [];
				if (!str.indexOf('<table') && str.indexOf('<tbody') < 0) {
					// String was a <table>, *may* have spurious <tbody>
					els = div.firstChild && div.firstChild.childNodes;
				} else if (wrap[1] == '<table>' && str.indexOf('<tbody') < 0) {
					// String was a bare <thead> or <tfoot>
					els = div.childNodes;
				}
				for (var i = els.length - 1; i >= 0 ; --i) {
					var el = els[i];
					if (el.nodeName.toLowerCase() == 'tbody' && !el.childNodes.length)
						el.parentNode.removeChild(el);
				}
			}
			elements = new HtmlElements(div.childNodes);
		} else {
			// Simply execute string as dom selector.
			// Make sure doc is wrapped.
			elements = DomNode.wrap(doc).getElements(this);
		}
		// Unbox if there's only one element in the array
		return elements.length == 1 ? elements[0] : elements;
	}
});

#endif // __browser_html_HtmlElement__
