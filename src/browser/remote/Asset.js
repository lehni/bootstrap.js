#ifndef __browser_Asset__
#define __browser_Asset__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif

////////////////////////////////////////////////////////////////////////////////
// Asset

Asset = new function() {
	// Clones props and remove all handlers:
	function getProperties(props) {
		return props ? Hash.create(props).each(function(val, key) {
			if (/^on/.test(key)) delete this[key];
		}) : {};
	}

	function createMultiple(type, sources, options) {
		var props = getProperties(options), count = 0;
		options = options || {};
		return sources.each(function(src) {
			props.onLoad = function() {
				if (options.onProgress)
					options.onProgress(src);
				if (++count == sources.length && options.onComplete)
					options.onComplete();
			}
			this.push(Asset[type](src, props));
		}, new HtmlElements());
	}

	return {
		script: function(src, props) {
			 // onLoad can be null
			var script = new HtmlElement('script')
				.addEvent('load', props.onLoad)
				.setProperty('src', src)
				.setProperties(getProperties(props))
				.addEvent('readystatechange', function() {
					if (/loaded|complete/.test(this.$.readyState))
						this.fireEvent('load');
				})
				.insertInside(Document.getElement('head'));
			// On Safari < 3, execute a HttpRequest for the same resource at
			// the same time. The resource will only be loaded once, and the
			// HttpRequest will recieve a notification, while the script does not.
			if (Browser.WEBKIT2)
				new HttpRequest(src, { method: 'get' }).addEvent('success', function() {
					script.fireEvent.bind(script, 'load').delay(1);
				}).send();
			return script;
		},

		stylesheet: function(src, props) {
			return new HtmlElement('link', Hash.create({
				rel: 'stylesheet', media: 'screen', type: 'text/css', href: src
			}, props)).insertInside(Document.getElement('head'));
		},

		image: function(src, props) {
			props = props || {};
			var image = new Image();
			image.src = src;
			var element = new HtmlElement('img', { src: src });
			['load', 'abort', 'error'].each(function(type) {
				var name = 'on' + type.capitalize();
				if (props[name]) element.addEvent(type, function() {
					this.removeEvent(type, arguments.callee);
					props[name].call(this);
				});
			});
			if (image.width && image.height)
				element.fireEvent.bind(element, 'load').delay(1);
			return element.setProperties(getProperties(props));
		},

	 	scripts: function(sources, options) {
			return createMultiple('script', sources, options);
		},

	 	stylesheets: function(sources, options) {
			return createMultiple('stylesheet', sources, options);
		},

	 	images: function(sources, options) {
			return createMultiple('image', sources, options);
		}
	}
};

#endif // __browser_Asset__