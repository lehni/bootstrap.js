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
		return Asset.create('script', {
			type: 'text/javascript', src: src
		}, props, true);
	},

	css: function(src, props) {
		return Asset.create('link', {
			rel: 'stylesheet', media: 'screen', type: 'text/css', href: src
		}, props, true);
	},

	image: function(src, props) {
		props = props || {};
		var img = new Image();
		var onLoad = props.onLoad, done = false;
		img.onload = props.onLoad = function() {
			if (onLoad && !done) {
				done = true;
				return onLoad();
			}
		}
		// BROWSER: Set src after onLoad, as on offline Opera, it loads
		// the image immediatelly!
		img.src = props.src = src;
		return Asset.create('img', props);
	},

 	images: function(srcs, opts) {
		opts = opts || {};
		if ($typeof(srcs) != 'array') srcs = [srcs];
		var imgs = [], count = 0;
		return srcs.each(function(src) {
			this.push(Asset.image(src, {
				onLoad: function() {
					if (opts.onProgress) opts.onProgress(src);
					if (++count == srcs.length && opts.onComplete) opts.onComplete();
				}
			}));
		}, []);
	},

	create: function(type, defs, props, inject) {
		var el = new Element(type).setProperties($H(defs).merge(props));
		return inject ? el.injectInside($E('head')) : el;
	}
};

#endif // __browser_Asset__