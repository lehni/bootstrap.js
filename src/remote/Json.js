#ifndef __lang_Json__
#define __lang_Json__

////////////////////////////////////////////////////////////////////////////////
// Json

#ifdef ECMASCRIPT_5

// We can fully rely on the native JSON object to be there.
Json = {
#ifdef RHINO
	encode: function(obj, properties) {
		// Do not send native Java objects through JSON.stringify
		return Base.type(obj) != 'java' ? JSON.stringify(obj, properties) : null;
	},

#elif defined(BROWSER) // BROWSER
	// Unfortunately IE does not natively support __proto__, so
	// we need to filter it out from Json
	encode: function(obj, properties) {
		return JSON.stringify(obj, properties || Browser.TRIDENT && function(key, value) {
			return key == '__proto__' ? undefined : value;
		});
	},

#else // !RHINO && !BROWSER
	encode: JSON.stringify,
#endif // !RHINO && !BROWSER
	decode: function(str, secure) {
		try {
			// No need for security checks when using native JSON.
			return JSON.parse(str);
		} catch (e) {
			return null;
		}
	}
};

#else // !ECMASCRIPT_5

Json = function(JSON) {
	var special = { '\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"' : '\\"', "'" : "\\'", '\\': '\\\\' };
	// Support the native Json object if it is there, fall back on JS version.
	return {
		encode: JSON
#ifdef RHINO
			? function(obj, properties) {
				// Do not send native Java objects through JSON.stringify
				return Base.type(obj) != 'java' ? JSON.stringify(obj, properties) : null;
			}
#elif defined(BROWSER) // BROWSER
			? function(obj, properties) {
				// Unfortunately IE does not natively support __proto__, so
				// we need to filter it out from Json
				return JSON.stringify(obj, properties || Browser.TRIDENT && function(key, value) {
					return key == '__proto__' ? undefined : value;
				});
			}
#else // !RHINO && !BROWSER
			? JSON.stringify
#endif // !RHINO && !BROWSER
			: function(obj, properties) {
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
				return null;
			},

		decode: JSON
			? function(str, secure) {
				try {
					// No need for security checks when using native JSON.
					return JSON.parse(str);
				} catch (e) {
					return null;
				}
			}
			: function(str, secure) {
				try {
					// Make sure the incoming data is actual JSON
					// Logic borrowed from http://json.org/json2.js
#ifdef BROWSER
					// Make sure leading/trailing whitespace is removed (IE can't handle it)
					return Base.type(str) == 'string' && (str = str.trim()) &&
#else // !BROWSER
					return Base.type(str) == 'string' && str &&
#endif // !BROWSER
						(!secure || /^[\],:{}\s]*$/.test(
							str.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@")
								.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]")
								.replace(/(?:^|:|,)(?:\s*\[)+/g, "")))
									? (new Function('return ' + str))() : null;
				} catch (e) {
					return null;
				}
			}
	};
}(this.JSON);

#endif // !ECMASCRIPT_5

#endif // __lang_Json__