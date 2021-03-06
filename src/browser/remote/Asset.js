//#ifndef __browser_remote_Asset__
//#define __browser_remote_Asset__

//#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 */
//#endif // HIDDEN

////////////////////////////////////////////////////////////////////////////////
// Asset

var Asset = new function() {
	// Clones props and remove all handlers:
	function getProperties(props) {
		return props ? Hash.create(props).each(function(val, key) {
			if (/^on/.test(key)) delete this[key];
		}) : {};
	}

	/*
	Trial at syncronized loading for multiple script assets
	but how to return the full set of assets, since they are created serially?
	
	function createMultiple(type, sources, options, sync) {
		var props = getProperties(options), count = 0;
		options = options || {};
		var assets = new HtmlElements();
		function load(src) {
			props.onLoad = function() {
				if (options.onProgress)
					options.onProgress.call(this, src);
				if (++count == sources.length && options.onComplete)
					options.onComplete.call(this);
			}
			assets.push(Asset[type](src, props));
		}
		if (sync) {
			var progress = options.onProgress;
			options.onProgress = function(src) {
				if (progress)
					progress.call(this, src);
				var next = sources[count + 1];
				if (next)
					load(next);
			};
			load(sources[0]);
		} else {
			sources.each(load);
		}
		return assets;
	}
	*/
	function createMultiple(type, sources, options) {
		var props = getProperties(options), count = 0;
		options = options || {};
		return sources.each(function(src) {
			props.onLoad = function() {
				if (options.onProgress)
					options.onProgress(src);
				if (++count == sources.length && options.onComplete)
					options.onComplete();
			};
			this.push(Asset[type](src, props));
		}, new HtmlElements());
	}

	return {
		script: function(src, props) {
			var script = DomElement.get('head').injectBottom('script', Hash.merge({
				events: {
				 	// props.onLoad can be null
					load: props.onLoad && function() {
						// We receive this event more than once on Opera, filter
						// out here...
						if (!this.loaded) {
							this.loaded = true;
							props.onLoad.call(this);
						}
					},
					readystatechange: function() {
						if (/loaded|complete/.test(this.$.readyState))
							this.fireEvent('load');
					}
				},
				src: src
			}, getProperties(props)));
			// On Safari < 3, execute a Request for the same resource at
			// the same time. The resource will only be loaded once, and the
			// Request will recieve a notification, while the script does not.
			if (Browser.WEBKIT && Browser.VERSION < 420)
				new Request({ url: src, method: 'get' }).addEvent('success', function() {
					script.fireEvent('load', [], 1);
				}).send();
			return script;
		},

		stylesheet: function(src, props) {
			return new HtmlElement('link', new Hash({
				rel: 'stylesheet', media: 'screen', type: 'text/css', href: src
			}, props)).insertInside(DomElement.get('head'));
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
				element.fireEvent('load', [], 1);
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
	};
};

//#endif // __browser_remote_Asset__