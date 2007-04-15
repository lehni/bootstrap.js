#ifndef __browser_Cookie__
#define __browser_Cookie__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif

////////////////////////////////////////////////////////////////////////////////
// Cookie

Cookie = {
	set: function(name, value, expires, path) {
		document.cookie = name + '=' + escape(value) + (expires ? ';expires=' +
			expires.toGMTString() : '') + ';path=' + (path || '/');
	},
	
	get: function(name) {
		var res = document.cookie.match('(?:^|;)\\s*' + name + '=([^;]*)');
		if (res) return unescape(res[1]);
	},

	remove: function(name) {
		this.set(key, '', -1);
	}
};

#endif // __browser_Cookie__