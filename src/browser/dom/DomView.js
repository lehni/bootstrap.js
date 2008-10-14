#ifndef __browser_dom_DomView__
#define __browser_dom_DomView__

////////////////////////////////////////////////////////////////////////////////
// DomView

DomView = DomElement.extend({
	_BEANS
	_type: 'view',

	getDocument: function() {
		return DomElement.get(this.$.document);
	},

	getView: function() {
		return this;
	}
});

#endif // __browser_dom_DomView__