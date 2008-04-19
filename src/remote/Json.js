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
#ifdef HIDDEN // #ifdef RHINO // TODO: uneval seems to cause problems with empty fields in arrays in Rhino (resulting in [,,,])
			var str = uneval(obj);
			return str[0] == '(' ? str.substring(1, str.length - 1) : str;
#else // !RHINO
			switch (Base.type(obj)) {
				case 'string':
#ifdef RHINO
					return uneval(obj);
#else
					return '"' + obj.replace(/[\x00-\x1f\\"]/g, replace) + '"';
#endif
				case 'array':
					return '[' + obj.collect(Json.encode) + ']';
				case 'object':
				case 'hash':
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

		decode: function(str, secure) {
			try {
				return (Base.type(str) != 'string' || !str.length) ||
					(secure && !/^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/.test(
						str.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, '')))
							? null : eval('(' + str + ')');
			} catch (e) {
				return null;
			}
		}
	};
};

#endif // __lang_Json__