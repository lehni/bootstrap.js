#ifndef __lang_Json__
#define __lang_Json__

////////////////////////////////////////////////////////////////////////////////
// Json

Json = new function() {
	var special = { '\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"' : '\\"', '\\': '\\\\' };

	function replace(chr) {
		return special[chr] || '\\u00' + Math.floor(chr.charCodeAt() / 16).toString(16) + (chr.charCodeAt() % 16).toString(16);
	}

	return {
		encode: function(obj) {
			switch ($typeof(obj)) {
				case 'string':
					return '"' + obj.replace(/[\x00-\x1f\\"]/g, replace) + '"';
				case 'array':
					return '[' + obj.map(this.encode).compact().join(',') + ']';
				case 'object':
					return '{' + Hash.map(obj, function(val, key) {
						val = Json.encode(val);
						if (val) return Json.encode(key) + ':' + val;
					}).compact() + '}';
				default:
					return obj + "";
			}
			return null;
		},

		decode: function(string, secure) {
			return ($typeof(string) != 'string' || !string.length) ||
				(secure && !(/^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/).test(string.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, '')))
				? null
			 	: eval('(' + string + ')');
		}
	};
};

#endif // __lang_Json__