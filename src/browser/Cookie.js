#ifndef __browser_Cookie__
#define __browser_Cookie__

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