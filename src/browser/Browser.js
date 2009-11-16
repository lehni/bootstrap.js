#ifndef __browser_Browser__
#define __browser_Browser__

////////////////////////////////////////////////////////////////////////////////
// Browser

Browser = new function() {
	var name = window.orientation != undefined ? 'ipod'
			: (navigator.platform.match(/mac|win|linux|nix/i) || ['other'])[0].toLowerCase();
	var fields = {
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
			return navigator.taintEnabled ? false : fields.XPATH ? fields.QUERY ? 525 : 420 : 419;
		},

		gecko: function() {
			return !document.getBoxObjectFor ? false : document.getElementsByClassName ? 19 : 18;
		}
	};
	for (var engine in engines) {
		var version = engines[engine]();
		if (version) {
			fields.ENGINE = engine;
			fields.VERSION = version;
			engine = engine.toUpperCase();
			fields[engine] = true;
			fields[(engine + version).replace(/\./g, '')] = true;
			break;
		}
	}
	// Add platform name directly in uppercase too
	fields[name.toUpperCase()] = true;

	// Add console loggin on most browsers as good as we can.
	fields.log = function() {
		// IE does not seem to join with ' ' and has problems with apply
		if (!Browser.TRIDENT && window.console && console.log)
			console.log.apply(console, arguments);
		else 
			(window.console && console.log
				|| window.opera && opera.postError 
				|| alert)(Array.join(arguments, ' '));
	}

	return fields;
};

#ifdef BROWSER_LEGACY
if (!this.encodeURIComponent) {
	encodeURIComponent = escape;
	decodeURIComponent = unescape;
}
#endif // BROWSER_LEGACY

#endif // __browser_Browser__