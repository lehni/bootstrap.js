//#ifndef __browser_remote_Cookie__
//#define __browser_remote_Cookie__

//#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 */
//#endif // HIDDEN

////////////////////////////////////////////////////////////////////////////////
// Cookie

var Cookie = {
	set: function(name, value, expires, path) {
		document.cookie = name + '=' + encodeURIComponent(value) + (expires ? ';expires=' +
			expires.toGMTString() : '') + ';path=' + (path || '/');
	},
	
	get: function(name) {
		var res = document.cookie.match('(?:^|;)\\s*' + name + '=([^;]*)');
		if (res) return decodeURIComponent(res[1]);
	},

	remove: function(name) {
		this.set(name, '', -1);
	}
};

//#endif // __browser_remote_Cookie__