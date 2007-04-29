#ifndef __browser_Window__
#define __browser_Window__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif

////////////////////////////////////////////////////////////////////////////////
// window

// Fix background flickering on IE.
/*@cc_on
try { document.execCommand('BackgroundImageCache', false, true); }
catch (e) {}
@*/

window.inject({
	/**
	 * @id window.open
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
			(['toolbar', 'menubar', 'location', 'status', 'resizable', 
				'scrollbars']).each(function(d) {
				if (!params[d]) params[d] = 0;
			});
			if (params.width && params.height) {
				if (params.left == null) params.left = Math.round(
					Math.max(0, (screen.width - params.width) / 2));
				if (params.top == null) params.top = Math.round(
					Math.max(0, (screen.height - params.height) / 2 - 40));
			}
			focus = params.focus;
			params = params.each(function(p, n) {
				if (!/^(focus|confirm)$/.test(n))
					this.push(n + '=' + p);
			}, []).join(',');
		}
		var win = this.$super(url, title.replace(/\s+|\.+|-+/gi, ''), params);
		if (win && focus) win.focus();
		return win;
	},

	addEvent: function(type, fn) {
		if (type == 'domready') {
			if (this.loaded) fn();
			else if (!this.events || !this.events.domready) {
				var domReady = function() {
					if (this.loaded) return;
					this.loaded = true;
					if (this.timer)  this.timer = this.timer.clear();
					Element.prototype.fireEvent.call(this, 'domready');
					this.events.domready = null;
				}.bind(this);
				if (document.readyState && (Browser.KHTML || Browser.MACIE)) { // safari and konqueror
					this.timer = (function() {
						window.status = document.readyState;
						if (/^(loaded|complete)$/.test(document.readyState)) domReady();
					}).periodic(50);
				} else if (document.readyState && Browser.IE) { //ie
					document.write('<script id=ie_ready defer src=javascript:void(0)><\/script>');
					$('ie_ready').onreadystatechange = function() {
						if (this.readyState == 'complete') domReady();
					};
				} else { // others
					this.addEvent('load', domReady);
					document.addEvent('DOMContentLoaded', domReady);
				}
			}
		}
		return this.$super(type, fn);
	}
});

#endif // __browser_Window__