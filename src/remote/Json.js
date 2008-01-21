#ifndef __lang_Json__
#define __lang_Json__

////////////////////////////////////////////////////////////////////////////////
// Json

Json = new function() {
#ifndef __RHINO // TODO: see bellow
	var special = { '\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"' : '\\"', '\\': '\\\\' };

	function replace(chr) {
		return special[chr] || '\\u00' + Math.floor(chr.charCodeAt() / 16).toString(16) + (chr.charCodeAt() % 16).toString(16);
	}
#endif // !RHINO

	return {
		encode: function(obj) {
#ifdef __RHINO // TODO: uneval seems to cause problems with empty fields in arrays in Rhino (resulting in [,,,])
			var str = uneval(obj);
			return str[0] == '(' ? str.substring(1, str.length - 1) : str;
#else // !RHINO
			switch (Base.type(obj)) {
				case 'string':
					return '"' + obj.replace(/[\x00-\x1f\\"]/g, replace) + '"';
				case 'array':
					return '[' + obj.collect(Json.encode) + ']';
				case 'hash':
				case 'object':
					return '{' + Hash.collect(obj, function(val, key) {
						val = Json.encode(val);
						if (val) return Json.encode(key) + ':' + val;
					}) + '}';
				default:
					return obj + '';
			}
			return null;
#endif // !RHINO
		},

		decode: function(string, secure) {
			try {
				return (Base.type(string) != 'string' || !string.length) ||
					(secure && !/^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/.test(
						string.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, '')))
					? null : eval('(' + string + ')');
			} catch (e) {
				return null;
			}
		}
	};
};

#endif // __lang_Json__