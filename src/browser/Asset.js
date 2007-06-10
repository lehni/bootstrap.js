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

Asset = {
	javascript: function(src, props) {
		var script = new HtmlElement('script', { src: src }).addEvents({
			load: props.onLoad, // can be null
			readystatechange: function(){
				if (this.readyState == 'complete') this.fireEvent('load');
			}
		});
		delete props.onload;
		return script.setProperties(props).appendInside(document.head);
	},

	css: function(src, props) {
		return new HtmlElement('link', Hash.create({
			rel: 'stylesheet', media: 'screen', type: 'text/css', href: src
		}, props)).appendInside(document.head);
	},

	image: function(src, props) {
		props = props || {};
		var image = new Image();
		image.src = src;
		var element = new HtmlElement('img', { src: src });
		['load', 'abort', 'error'].each(function(type) {
			var event = props['on' + type];
			delete props['on' + type];
			if (event) element.addEvent(type, function(){
				this.removeEvent(type, arguments.callee);
				event.call(this);
			});
		});
		if (image.width && image.height) element.fireEvent.delay(1, element, 'load');
		return element.setProperties(props);
	},

 	images: function(srcs, opts) {
		opts = opts || {};
		if (!src.push) srcs = [srcs];
		var imgs = [], count = 0;
		return srcs.each(function(src) {
			this.push(Asset.image(src, {
				onLoad: function() {
					if (opts.onProgress) opts.onProgress(src);
					if (++count == srcs.length && opts.onComplete) opts.onComplete();
				}
			}));
		}, new HtmlElements());
	}
};

#endif // __browser_Asset__