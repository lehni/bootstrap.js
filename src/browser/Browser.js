#ifndef __browser_Browser__
#define __browser_Browser__

////////////////////////////////////////////////////////////////////////////////
// Browser

Browser = new function() {
	var name = (navigator.platform.match(/(MAC)|(WIN)|(LINUX)|(NIX)/i) || ['OTHER'])[0].toUpperCase();
	var js/*@cc_on=@_jscript_version@*/, xpath = !!document.evaluate;
	var webkit = document.childNodes && !document.all && !navigator.taintEnabled;
	var ret = {
		PLATFORM: name,
		WEBKIT: webkit,
		WEBKIT2: webkit && !xpath,
		WEBKIT3: webkit && xpath,
		OPERA: !!window.opera,
		GECKO: !!document.getBoxObjectFor,
		IE: !!js,
		IE5: js >= 5 && js < 5.5,
		IE55: js == 5.5,
		IE6: js == 5.6,
		IE7: js == 5.7,
		MACIE: js && name == 'MAC',
		XPATH: xpath
	};
	ret[name] = true;
	return ret;
};

#endif // __browser_Browser__