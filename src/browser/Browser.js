#ifndef __browser_Browser__
#define __browser_Browser__

////////////////////////////////////////////////////////////////////////////////
// Browser

Browser = (function() {
	var ua = navigator.userAgent, mac = /Mac/.test(ua), js/*@cc_on=@_jscript_version@*/;
	return {
		WIN: /Win/.test(ua),
		MAC: mac,
		UNIX: /X11/.test(ua),
		KHTML: document.childNodes && !document.all && !navigator.taintEnabled,
		OPERA: !!window.opera,
		GECKO: !!document.getBoxObjectFor,
		IE: !!js,
		IE5: js >= 5 && js < 5.5,
		IE55: js == 5.5,
		IE6: js == 5.6,
		IE7: js == 5.7,
		MACIE: js && mac
	};
})();

#if !defined(EXTEND_OBJECT) || defined(BROWSER_LEGACY)
window.inject = document.inject = Base.prototype.inject;
#endif // BROWSER_LEGACY

#endif // __browser_Browser__