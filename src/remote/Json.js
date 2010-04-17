#ifndef __lang_Json__
#define __lang_Json__

////////////////////////////////////////////////////////////////////////////////
// Json

Json = function() { // Do not open scope as new function() so this == global == window
	// Support the native Json object if it is there:
	var JSON = this.JSON;
	var special = { '\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"' : '\\"', "'" : "\\'", '\\': '\\\\' };
	return {
		encode: function(obj, properties) {
#ifdef RHINO
			// Do not send native Java objects through JSON.stringify
			if (JSON && Base.type(obj) != 'java')
#else // !RHINO
			if (JSON)
#endif // !RHINO
				// Unfortunately IE does not natively support __proto__, so
				// we need to filter it out from Json
#ifdef BROWSER
				return JSON.stringify(obj, properties || Browser.TRIDENT && function(key, value) {
					return key == '__proto__' ? undefined : value;
				});
#else // !BROWSER
				return JSON.stringify(obj, properties);
#endif // !BROWSER
			if (Base.type(properties) == 'array') {
				// Convert properties to a lookup table:
				properties = properties.each(function(val) {
					this[val] = true;
				}, {});
			}
			switch (Base.type(obj)) {
				case 'string':
					return '"' + obj.replace(/[\x00-\x1f\\"]/g, function(chr) {
						return special[chr] || '\\u' + chr.charCodeAt(0).toPaddedString(4, 16);
					}) + '"';
				case 'array':
					return '[' + obj.collect(function(val) {
						return Json.encode(val, properties);
					}) + ']';
				case 'object':
				// Treat hash just like object
				case 'hash':
					return '{' + Hash.collect(obj, function(val, key) {
						if (!properties || properties[key]) {
							val = Json.encode(val, properties);
							if (val !== undefined)
								return Json.encode(key) + ':' + val;
						}
					}) + '}';
				// Filter out functions, they are not part of JSON
				case 'function':
					return undefined;
				default:
					return obj + '';
			}
			return undefined;
		},

		decode: function(str, secure) {
			try {
				// Make sure the incoming data is actual JSON
				// Logic borrowed from http://json.org/json2.js
#ifdef BROWSER
				// Make sure leading/trailing whitespace is removed (IE can't handle it)
				return Base.type(str) == 'string' && (str = str.trim()) &&
#else // !BROWSER
				return Base.type(str) == 'string' && str &&
#endif // !BROWSER
					// No need for security checks when using native JSON (?)
					(!secure || JSON || /^[\],:{}\s]*$/.test(
						str.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@")
							.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]")
							.replace(/(?:^|:|,)(?:\s*\[)+/g, "")))
								? JSON ? JSON.parse(str) : (new Function('return ' + str))() : null;
			} catch (e) {
				return null;
			}
		}
	};
}();

#endif // __lang_Json__