#ifndef __browser_HtmlElement__
#define __browser_HtmlElement__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif

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
		return (' ' + this.$.className + ' ').indexOf(' ' + name + ' ') != -1;
		// The above performs faster than this:
		// return new RegExp('(^|\\s*)' + name + '(\\s*|$)').test(this.className);
	},

	getHtml: function() {
		return this.$.innerHTML;
	},

	setHtml: function(html) {
		this.$.innerHTML = html;
		return this;
	}
});

// Short-cut to HtmlElement.get and HtmlElement.select
// Bind to HtmlElement, as HtmlElement.prototype._elements is looked up
// in select!
$ = HtmlElement.get.bind(HtmlElement);
$$ = HtmlElement.select.bind(HtmlElement);

#endif // __browser_HtmlElement__
