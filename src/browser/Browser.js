#ifndef __browser_Browser__
#define __browser_Browser__

////////////////////////////////////////////////////////////////////////////////
// Browser

Browser = new function() {
	var name = window.orientation != undefined ? 'ipod'
			: (navigator.platform.match(/mac|win|linux|nix/i) || ['other'])[0].toLowerCase();
	var ret = {
		PLATFORM: name,
		XPATH: !!document.evaluate,
		QUERY: !!document.querySelector
	};
	var engines = {
		presto: function() {
			return !window.opera ? false : arguments.callee.caller ? 960 : document.getElementsByClassName ? 950 : 925;
		},

		trident: function() {
			var ver/*@cc_on=@_jscript_version@*/;
			return !ver ? false : ver >= 5 && ver < 5.5 ? 5 : ver == 5.5 ? 5.5 : ver * 10 - 50;
		},

		webkit: function() {
			return navigator.taintEnabled ? false : ret.XPATH ? ret.QUERY ? 525 : 420 : 419;
		},

		gecko: function() {
			return !document.getBoxObjectFor ? false : document.getElementsByClassName ? 19 : 18;
		}
	};
	for (var engine in engines) {
		var version = engines[engine]();
		if (version) {
			ret.ENGINE = engine;
			ret.VERSION = version;
			engine = engine.toUpperCase();
			ret[engine] = true;
			ret[(engine + version).replace(/\./g, '')] = true;
			break;
		}
	}
	// Add platform name directly in uppercase too
	ret[name.toUpperCase()] = true;
	return ret;
};

#ifdef BROWSER_LEGACY
if (!this.encodeURIComponent) {
	encodeURIComponent = escape;
	decodeURIComponent = unescape;
}
#endif // BROWSER_LEGACY

#endif // __browser_Browser__