#ifndef __browser_html_HtmlElement__
#define __browser_html_HtmlElement__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif

#include "../dom/DomElement.js"

////////////////////////////////////////////////////////////////////////////////
// HtmlElements

HtmlElements = DomElements.extend();

////////////////////////////////////////////////////////////////////////////////
// HtmlElement

HtmlElement = DomElement.extend({
	_elements: HtmlElements
});

// DomElement.extend sets inject to the version that does not alter
// Dom / HtmlElements. Set it back here again, as we want everything injected
// into HtmlElement be injeted as a multiplie version into HtmlElements as well.
HtmlElement.inject = DomElement.inject;

// Use the modified inject function from above which injects both into HtmlElement
// and HtmlElements.
HtmlElement.inject({
	getClass: function() {
		return this.$.className;
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
	},

	getHtml: function() {
		return this.$.innerHTML;
	},

	setHtml: function(html) {
		this.$.innerHTML = html;
		return this;
	},

	getText: function() {
		var tag = this.getTag();
		return /^(style|script)$/.test(tag)
			? Browser.IE
				? tag == 'style' ? this.$.styleSheet.cssText : this.getProperty('text')
				: this.$.innerHTML
			: this.$.innerText || this.$.textContent;
	},

	setText: function(text) {
		var tag = this.getTag();
		if (/^(style|script)$/.test(tag)) {
			if (Browser.IE) {
				if (tag == 'style') this.$.styleSheet.cssText = text;
				else this.setProperty('text', text);
			} else {
				this.$.innerHTML = text;
			}
		} else {
			this.$[this.$.innerText !== undefined ? 'innerText' : 'textContent'] = text;
		}
		return this;
	}
});

////////////////////////////////////////////////////////////////////////////////
// toElement conversion for Array and String

Array.inject({
	toElement: function(doc) {
		doc = DomElement.get(doc || document);
		//	['div', { margin: 10 }, [ // Children
		//		'span', { html: 'hello ' },
		//		'<span>world</span>'
		//	]]
		var elements = new HtmlElements();
		for (var i = 0; i < this.length;) {
			var value = this[i++], element = null;
			if (typeof value == 'string') {
				// If the string is html, convert it through String#toElement.
				// Otherwise assume it's a tag name, and see if the following 
				// parameter is a properties hash. Use these to create the element:
				element = value.isHtml()
					? value.toElement(doc)
					: doc.createElement(value, /^(object|hash)$/.test(Base.type(this[i])) && this[i++]);
				// See if it has children defined, and add them through Array#toElement
				if (Base.type(this[i]) == 'array')
					element.injectBottom(this[i++].toElement(doc));
			} else if (value && value.toElement) {
				// Anything else
				element = value.toElement(doc);
			}
			if (element)
				elements.push(element);
		}
		return elements.length == 1 ? elements[0] : elements;
	}
});

String.inject({
	toElement: function(doc) {
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
			if (Browser.IE) {
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
			elements = DomElement.get(doc).getElements(this);
		}
		return elements.length == 1 ? elements[0] : elements;
	}
});

#endif // __browser_html_HtmlElement__
