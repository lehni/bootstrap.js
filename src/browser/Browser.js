#ifndef __browser_Browser__
#define __browser_Browser__

////////////////////////////////////////////////////////////////////////////////
// Browser

Browser = (function() {
	var ua = navigator.userAgent, av = navigator.appVersion;
	var ret = {
		WIN: /Win/.test(ua),
		MAC: /Mac/.test(ua),
		UNIX: /X11/.test(ua),
		KHTML: document.childNodes && !document.all && !navigator.taintEnabled,
		OPERA: !!window.opera,
		GECKO: !!document.getBoxObjectFor
	};
	// TODO: make sure we find Mac IE too (does not have ActiveXObject)
	ret.IE = /*!!window.ActiveXObject || */!ret.OPERA && /MSIE/.test(ua);
	if (ret.IE) {
		ret.IE5 = /MSIE 5.0/.test(av);
		if (!ret.IE5) ret[window.XMLHttpRequest ? 'IE7' : 'IE6'] = true;
		ret.MACIE = ret.MAC;
	}
	return ret;
})();

#ifdef BROWSER_LEGACY
window.inject = document.inject = Object.prototype.inject;
#endif // BROWSER_LEGACY

#endif // __browser_Browser__