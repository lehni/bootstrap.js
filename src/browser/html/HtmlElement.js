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
	_elements: HtmlElements,

	initialize: function(el, props) {
		var ret = this.base(el, props);
		if (ret) return ret;
		// TODO: Do we really need this.style? Otherwise initialize
		// would not need to be overridden.
		this.style = this.$.style;
	}
});

// DomElement.extend sets inject to the version that does not alter
// Dom / HtmlElements. Set it back here again, as we want everything injected
// into HtmlElement be injeted as a multiplie version into HtmlElements as well.
HtmlElement.inject = DomElement.inject;

// Use the modified inject function from above which injects both into HtmlElement
// and HtmlElements.
HtmlElement.inject({
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
			} else
				this.$.innerHTML = text;
		} else
			this[this.innerText !== undefined ? 'innerText' : 'textContent'] = text;
		return this;
	}
});

#endif // __browser_html_HtmlElement__
