#ifndef __browser_dom_Document__
#define __browser_dom_Document__

////////////////////////////////////////////////////////////////////////////////
// Document

Document = DomElement.get(document).inject({
	createElement: function(tag, props) {
		// Call DomElement.create, the internal creation helper. This does not
		// fully set props, only the one needed for the IE workaround.
		// set(props) is called after for all the others.
		return DomElement.get(DomElement.create(tag, props, this.$)).set(props);
	},

	createTextNode: function(text) {
		return this.$.createTextNode(text);
	},

	getDocument: function() {
		return this;
	},

	getWindow: function() {
		return DomElement.get(this.defaultView || this.parentWindow);
	}
});

#ifdef DEFINE_GLOBALS

function $(selector, root) {
	return (DomElement.get(root) || Document).getElement(selector);
}

function $$(selector, root) {
	return (DomElement.get(root) || Document).getElements(selector);
}

#endif // DEFINE_GLOBALS

#endif // __browser_dom_Document__