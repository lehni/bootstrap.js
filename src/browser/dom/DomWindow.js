#ifndef __browser_html_DomWindow__
#define __browser_html_DomWindow__

#include "DomElement.js"

////////////////////////////////////////////////////////////////////////////////
// DomWindow

// Let Window point to DomWindow for now, so new Window(...) can be called.
// This makese for nicer code, but might have to change in the future.
Window = DomWindow = DomElement.extend({
	_BEANS
	_type: 'window',
	// Don't automatically call this.base in overridden initialize methods
	_initialize: false,
	_methods: ['close', 'alert', 'prompt', 'confirm', 'blur', 'focus', 'reload'],

	getDocument: function() {
		return DomNode.wrap(this.$.document);
	},

	getWindow: function() {
		return this;
	},

	// TODO: add get/setStatus, get/setLocation, and find way to deal with
	// referencing of native fields at the end of initialize.

	/**
	 * A constructor for DomWindow that is based on window.open and extends it
	 * to allow more options in the third parameter.
	 *
	 * If param is a string, the standard window.open is executed.
	 * If param is an object, additional parameters maybe be defined, such as
	 * param.confirm, param.focus, etc. Also, if param.width & height are 
	 * defined, The window is centered on screen.
	 */
	initialize: function(param) {
		var win;
		// Are we wrapping a window?
		if (param.location && param.frames && param.history) {
			// Do not return yet as we need to add some properties further down
			win = this.base(param) || this;
		} else {
			// If param a string, convert to param object, using its value for url.
			if (typeof param == 'string')
				param = { url: param };
			// Convert boolean values to 0 / 1:
			(['toolbar','menubar','location','status','resizable','scrollbars']).each(function(key) {
				param[key] = param[key] ? 1 : 0;
			});
			// Center window if left / top is not defined, but dimensions are:
			if (param.width && param.height) {
				if (param.left == null) param.left = Math.round(
					Math.max(0, (screen.width - param.width) / 2));
				if (param.top == null) param.top = Math.round(
					Math.max(0, (screen.height - param.height) / 2 - 40));
			}
			// Now convert paramets to string.
			var str = Base.each(param, function(val, key) {
				// Filter out non-standard param names and convert boolean values to 0 / 1 simply by adding 0 to it
				if (!/^(focus|confirm|url|name)$/.test(key))
					this.push(key + '=' + (val + 0));
			}, []).join();
			win = this.base(window.open(param.url, param.name.replace(/\s+|\.+|-+/gi, ''), str)) || this;
			if (win && param.focus)
				win.focus();
		}
		// Copy over default windows properties before returning
		return ['location', 'frames', 'history'].each(function(key) {
			this[key] = this.$[key];
		}, win);
	}
});

#endif // __browser_html_DomWindow__