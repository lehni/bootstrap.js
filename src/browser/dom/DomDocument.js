#ifndef __browser_dom_DomDocument__
#define __browser_dom_DomDocument__

#include "DomElement.js"

////////////////////////////////////////////////////////////////////////////////
// DomDocument

DomDocument = DomElement.extend({
	_BEANS
	_type: 'document',

	initialize: function() {
		if(Browser.TRIDENT && Browser.VERSION < 7)
			try {
				// Fix background flickering on IE.
				this.$.execCommand('BackgroundImageCache', false, true);
			} catch (e) {}
	},

	createElement: function(tag, props) {
		// Call DomElement.create, the internal creation helper. This does not
		// fully set props, only the one needed for the IE workaround.
		// set(props) is called after for all the others.
		return DomElement.wrap(DomElement.create(tag, props, this.$)).set(props);
	},

	createTextNode: function(text) {
		// TODO: Add wrapper for text nodes too, and wrap here as well. This
		// will solve the prolem for wrongly wrapped textnodes as elements
		// in getChildNodes too.
		// TODO: Consider renaming to createText
		return this.$.createTextNode(text);
	},

	getDocument: function() {
		return this;
	},

	getWindow: function() {
		return DomElement.wrap(this.$.defaultView || this.$.parentWindow);
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