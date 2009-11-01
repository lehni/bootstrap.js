#ifndef __lang_Json__
#define __lang_Json__

////////////////////////////////////////////////////////////////////////////////
// Json

Json = new function() {
	var special = { '\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"' : '\\"', "'" : "\\'", '\\': '\\\\' };
	return {
		encode: function(obj, singles) {
#ifdef HIDDEN // TODO: On Rhino, uneval seems to cause problems with empty fields in arrays in Rhino (resulting in [,,,])
			var str = uneval(obj);
			return str[0] == '(' ? str.substring(1, str.length - 1) : str;
#endif // HIDDEN
			switch (Base.type(obj)) {
				case 'string':
#ifdef RHINO
					// Call toString() to Make sure it's a raw string, not an object
					if (!singles)
						return uneval(obj.toString());
#endif
					var quote = singles ? "'" : '"';
					return quote + obj.replace(new RegExp('[\\x00-\\x1f\\\\' + quote + ']', 'g'), function(chr) {
						return special[chr] || '\\u' + chr.charCodeAt(0).toPaddedString(4, 16);
					}) + quote;
				case 'array':
					return '[' + obj.collect(function(val) {
						return Json.encode(val, singles);
					}) + ']';
				case 'object':
				case 'hash':
					return '{' + Hash.collect(obj, function(val, key) {
						val = Json.encode(val, singles);
						if (val) return Json.encode(key, singles) + ':' + val;
					}) + '}';
				case 'function':
					return null;
				default:
					return obj + '';
			}
			return null;
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