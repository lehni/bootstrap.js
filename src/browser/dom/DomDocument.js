#ifndef __browser_dom_DomDocument__
#define __browser_dom_DomDocument__

#include "DomElement.js"

////////////////////////////////////////////////////////////////////////////////
// DomDocument

DomDocument = DomElement.extend({
	_BEANS
	_type: 'document',
	// TODO: Find out if this is needed here. Doesn't DomElement already define it?
	_elements: DomElements,

	initialize: function() {
		if(Browser.IE)
			try {
				// Fix background flickering on IE.
				this.$.execCommand('BackgroundImageCache', false, true);
			} catch (e) {}
	},

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

	getView: function() {
		return DomElement.get(this.$.defaultView || this.$.parentWindow);
	},

	open: function() {
		this.$.open();
	},

	close: function() {
		this.$.close();
	},

	write: function(markup) {
		this.$.write(markup);
	},

	writeln: function(markup) {
		this.$.writeln(markup);
	}
});

#endif // __browser_dom_DomDocument__