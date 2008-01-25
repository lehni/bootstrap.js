#ifndef __browser_dom_DomView__
#define __browser_dom_DomView__

////////////////////////////////////////////////////////////////////////////////
// DomView

DomView = DomElement.extend({
	_type: 'view',

	getDocument: function() {
		return DomElement.get(this.document);
	},
	
	getView: function() {
		return this;
	},

	/**
	 * Overrides window.open to allow more options in the third parameter.
	 * If params is a string, the standard window.open is executed.
	 * If param is an object, additional parameters maybe be defined, such as
	 * params.confirm, params.focus, etc. Also, if params.width & height are 
	 * defined, The window is centered on screen.
	 */
	open: function(url, title, params) {
		var focus;
		// only perform the updated window.open if params is set and is not
		// a string!
		if (params && typeof params != 'string') {
			if (params.confirm && !confirm(params.confirm))
				return null;
			(['toolbar','menubar','location','status','resizable','scrollbars']).each(function(d) {
				if (!params[d]) params[d] = 0;
			});
			if (params.width && params.height) {
				if (params.left == null) params.left = Math.round(
					Math.max(0, (screen.width - params.width) / 2));
				if (params.top == null) params.top = Math.round(
					Math.max(0, (screen.height - params.height) / 2 - 40));
			}
			focus = params.focus;
			// Now convert paramets to string.
			params = Base.each(params, function(p, n) {
				if (!/^(focus|confirm)$/.test(n))
					this.push(n + '=' + p);
			}, []).join(',');
		}
		var win = this.$.open(url, title.replace(/\s+|\.+|-+/gi, ''), params);
		if (win && focus) win.focus();
		return win;
	}
});

#endif // __browser_dom_DomView__