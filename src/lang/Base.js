#ifndef __lang_Base__
#define __lang_Base__

/**
 * Bootstrap JavaScript Library
 * (c) 2006 - 2010 Juerg Lehni, http://scratchdisk.com/
 *
 * Bootstrap is released under the MIT license
 * http://bootstrap-js.net/
 *
 * Inspirations:
 * http://dean.edwards.name/weblog/2006/03/base/
 * http://dev.helma.org/Wiki/JavaScript+Inheritance+Sugar/
 * http://prototypejs.org/
 * http://mootools.net/
 *
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */

////////////////////////////////////////////////////////////////////////////////
// Base

#ifdef FIX_PROTO
// Fix __proto__ for browsers where it is not implemented. Do this before
// anything else, for "var i in" to work.
if (!this.__proto__) {
#ifdef EXTEND_OBJECT
	var fix = [Object, Function, Number, Boolean, String, Array, Date, RegExp];
#else // !EXTEND_OBJECT
	var fix = [Function, Number, Boolean, String, Array, Date, RegExp];
#endif // !EXTEND_OBJECT
	for (var i in fix)
		fix[i].prototype.__proto__ = fix[i].prototype;
}
#endif // !FIX_PROTO

new function() { // Bootstrap scope
	/**
	 * Private function that checks if an object contains a given property.
	 * Naming it 'has' causes problems on Opera when defining
	 * Object.prototype.has, as the local version then seems to be overriden
	 * by that. Giving it a idfferent name fixes it.
	 */
#ifdef ECMASCRIPT_3
	function has(obj, name) {
		return obj.hasOwnProperty(name);
	}
#else // !ECMASCRIPT_3
	// Check if environment supports hasOwnProperty, and use a differnt version
	// of has if ti does, for higher performance as checking on each has() call.
	var has = {}.hasOwnProperty
		? function(obj, name) {
			return obj.hasOwnProperty(name);
		}
		: function(obj, name) {
			// We need to filter out what does not belong to the object itself.
			// This is done by comparing the value with the value of the same
			// name in the prototype. If the value is equal it's defined in one
			// of the prototypes, not the object itself.
#ifdef EXTEND_OBJECT
			// We're extending Object, so we can assume __proto__ to always be
			// there, even when it's simulated on browsers not supporting it.
			return obj[name] !== obj.__proto__[name];
#else // !EXTEND_OBJECT
			// Object.prototype is untouched, so we cannot assume __proto__ to
			// always be defined on legacy browsers.
			return obj[name] !== (obj.__proto__ || Object.prototype)[name];
#endif // !EXTEND_OBJECT
		};
#endif // !ECMASCRIPT_3

#ifdef PROPERTY_DEFINITION // Use or simulate the standard Object.defineProperty
#ifdef ECMASCRIPT_5 // ECMAScript version 5 compliant engines such as Rhino
	function define(obj, name, desc) {
		// Not all objects support Object.defineProperty, so fall back to 
		// simply setting properties
		try {
			Object.defineProperty(obj, name, desc);
		} catch (e) {
			// Fallback
			obj[name] = desc.value;
		}
		return obj;
	}

	function describe(obj, name) {
		try {
			return Object.getOwnPropertyDescriptor(obj, name);
		} catch (e) {
			return has(obj, name)
				? { enumerable: true, configurable: true, writable: true, value: obj[name] }
				: null;
		}
	}
#else // !ECMASCRIPT_5
	// Support a mixed environment of some ECMAScript 5 features present,
	// along with __defineGetter/Setter__ functions, as found in browsers today.
	var _define = Object.defineProperty, _describe = Object.getOwnPropertyDescriptor;

	function define(obj, name, desc) {
		if (_define)
			try { return _define(obj, name, desc); } catch (e) {}
		if ((desc.get || desc.set) && obj.__defineGetter__) {
			if (desc.get) obj.__defineGetter__(obj, desc.get);
			if (desc.set) obj.__defineSetter__(obj, desc.set);
		} else {
			obj[name] = desc.value;
		}
		return obj;
	}

	function describe(obj, name) {
		if (_describe)
			try { return _describe(obj, name); } catch (e) {}
		var get = obj.__lookupGetter__ && obj.__lookupGetter__(name);
		return get
			? { enumerable: true, configurable: true, get: get, set: obj.__lookupSetter__(name) }
			: has(obj, name)
				? { enumerable: true, configurable: true, writable: true, value: obj[name] }
				: null;
	}
#endif // !ECMASCRIPT_5
#endif // !PROPERTY_DEFINITION

	/**
	 * Private function that injects functions from src into dest, overriding
	 * (and inherinting from) base. if allowProto is set, the name "prototype"
	 * is inherited too. This is false for static fields, as prototype there
	 * points to the classes' prototype.
	 */
#ifdef HELMA
	// Real base is used for the versioning mechanism as desribed above.
	function inject(dest, src, enumerable, base, generics, version) {
#else // !HELMA
	function inject(dest, src, enumerable, base, generics) {
#endif // !HELMA
		/**
		 * Private function that injects one field with given name
		 */
#ifdef BEANS
		function field(name, val, dontCheck, generics) {
			// This does even work for prop: 0, as it will just be looked up
			// again through describe...
			if (!val)
				val = (val = describe(src, name)) && (val.get ? val : val.value);
			var type = typeof val, func = type == 'function', res = val,
				prev = dest[name], bean;
#else // !BEANS
		function field(name, dontCheck, generics) {
#ifdef PROPERTY_DEFINITION
			var val = (val = describe(src, name)) && (val.get ? val : val.value),
				func = typeof val == 'function', res = val, prev = dest[name];
#else // !BEANS && !PROPERTY_DEFINITION
			var val = src[name], func = typeof val == 'function', res = val,
				prev = dest[name];
#endif // !PROPERTY_DEFINITION
#endif // !BEANS
			// Make generics first, as we might jump out bellow in the
			// val !== (src.__proto__ || Object.prototype)[name] check,
			// e.g. when explicitely reinjecting Array.prototype methods
			// to produce generics of them.
			if (generics && func && (!src.preserve || !generics[name])) generics[name] = function(bind) {
				// Do not call Array.slice generic here, as on Safari,
				// this seems to confuse scopes (calling another
				// generic from generic-producing code).
				return bind && dest[name].apply(bind,
					Array.prototype.slice.call(arguments, 1));
			}
			// TODO: On proper JS implementation, dontCheck is always set
			// Add this with a compile switch here!
			if ((dontCheck || val !== undefined && has(src, name)) && (!prev || !src.preserve)) {
				if (func) {
					if (prev && /\bthis\.base\b/.test(val)) {
#ifdef HELMA
						// If the base function has already the _version field
						// set, it is a function previously defined through
						// inject. In this case, the value of _version decides
						// what to do:
						// If we're in the same compilation cicle, Aspect
						// behavior is used, by continuously referencing the
						// previously defined functions in the same cicle.
						// Otherwise, the real previous function is fetched from
						// _previous, making sure we do not end up in aspect-like
						// changes of the multiple instances of the same function,
						// compiled in different cicles.
						// Since Helma always recompiles code from all
						// repositories for a given prototype when a change
						// happens in one of them, we also need to compare dest,
						// and skip backwards until we find the first version that
						// is not compiled for this prototype (== dest).
						// Otherwise we would produce referential loops.
						while (prev._version && prev._version != version && prev._dest == dest)
							prev = prev._previous;
#endif // HELMA
						var fromBase = base && base[name] == prev;
						res = (function() {
							var tmp = this.base;
							// Look up the base function each time if we can,
							// to reflect changes to the base class after
							// inheritance.
#ifdef PROPERTY_DEFINITION
							define(this, 'base', { value: fromBase ? base[name] : prev, configurable: true });
#else // !PROPERTY_DEFINITION
							this.base = fromBase ? base[name] : prev;
#endif // !PROPERTY_DEFINITION
							try { return val.apply(this, arguments); }
							finally { this.base = tmp; }
						}).pretend(val);
#ifdef HELMA
						// If versioning is used, set the new version now, and
						// keep a reference to the real previous function, as
						// used in the code above.
						if (version) {
							res._version = version;
							res._previous = prev;
							// Store this function's destination as well, since
							// it is needed when searching for the right previous
							// version of a function when code is updated.
							// See above.
							res._dest = dest;
						}
#endif // HELMA
					}
#ifdef BEANS
					// Only set produce bean properties when getters are
					// specified. This does not produce properties for setter-
					// only properties which makes sense and also avoids double-
					// injection for beans with both getters and setters.
#ifdef BEANS_OLD
					// Support old and new format of bean flag.
					if ((src.beans || src._beans) && (bean = name.match(/^(get|is)(([A-Z])(.*))$/)))
#else // !BEANS_OLD
					if (src.beans && (bean = name.match(/^(get|is)(([A-Z])(.*))$/)))
#endif // !BEANS_OLD
						try {
							field(bean[3].toLowerCase() + bean[4], {
								get: src['get' + bean[2]] || src['is' + bean[2]],
								set: src['set' + bean[2]]
							}, true);
						} catch (e) {}
#endif // BEANS
				}
#ifdef PROPERTY_DEFINITION
				// No need to look up getter if this is a function already.
				// This also prevents _collection from becoming a getter, as
				// DomElements is a constructor function and has both get / set
				// generics for DomElement#get / #set.
				if (!res || func || !res.get && !res.set)
					res = { value: res, writable: true };
				// Only set/change configurable and enumerable if this field is
				// configurable
				if ((describe(dest, name) || { configurable: true }).configurable) {
					res.configurable = true;
					res.enumerable = enumerable;
				}
				define(dest, name, res);
#else // !PROPERTY_DEFINITION
				dest[name] = res;
#endif // !PROPERTY_DEFINITION
			}
		}
		// Iterate through all definitions in src with an iteator function
		// that checks if the field is a function that needs to be wrapped for
		// calls of base. This is only needed if the function in base is
		// different from the one in src, and if the one in src is actually
		// calling base through base. the string of the function is parsed
		// for base to detect calls.
		// dest[name] then is set to either src[name] or the wrapped function.
		if (src) {
			for (var name in src)
				if (has(src, name) && !/^(HIDDEN_FIELDS)$/.test(name))
#ifdef BEANS
					field(name, null, true, generics);
#else // !BEANS
					field(name, true, generics);
#endif // !BEANS
#ifdef BROWSER
			// IE (and some other browsers?) never enumerate these, even 
			// if they are simply set on an object. Force their creation.
			// Do not create generics for these, and check them for not
			// being defined (by passing undefined for dontCheck).
			field('toString');
			field('valueOf');
#endif // BROWSER
		}
	}

	/**
	 * Private function that creates a constructor to extend the given object.
	 * When this constructor is called through new, a new object is craeted
	 * that inherits all from obj.
	 */
	function extend(obj) {
		// Create the constructor for the new prototype that calls initialize
		// if it is defined.
		function ctor(dont) {
#ifdef FIX_PROTO
			// Fix __proto__
			this.__proto__ = obj;
#endif // FIX_PROTO
			// Call the constructor function, if defined and we're not inheriting
			// in which case ctor.dont would be set, see further bellow.
			if (this.initialize && dont !== ctor.dont)
				return this.initialize.apply(this, arguments);
		}
		ctor.prototype = obj;
		// Add a toString function that delegates to initialize if possible
		ctor.toString = function() {
			return (this.prototype.initialize || function() {}).toString();
		}
		return ctor;
	}

	// Now we can use the private inject to add methods to the Function.prototype
	inject(Function.prototype, {
		inject: function(src/*, ... */) {
			if (src) {
				var proto = this.prototype, base = proto.__proto__ && proto.__proto__.constructor;
				// When called from extend, a third argument is passed, pointing
				// to the base class (the constructor).
				// this variable is needed for inheriting static fields and proper
				// lookups of base on each call (see bellow)
#ifdef HELMA
				// On the server side, we need some kind of version handling for
				// HopObjects because every time a prototype gets updated, the js
				// file is evaluated in the same scope again. Using .inject()
				// in combination with base calls would result in a growing chain
				// of calls to previous versions if no version handling would be
				// involved.
				// The versions are used further up to determine wether the
				// previously defined function in the same prototype should be
				// used (AOP-like), or the same function in the real super
				// prototype. _version is only added to constructors that are or
				// inherit from HopObject, and is automatically increased in
				// onCodeUpdate, as defined bellow.
				var version = (this == HopObject || proto instanceof HopObject)
						&& (proto.constructor._version || (proto.constructor._version = 1));
#endif // HELMA
#ifndef HELMA // !HELMA
				inject(proto, src, false, base && base.prototype, src.generics && this);
#else // HELMA
				// Pass version
				inject(proto, src, false, base && base.prototype, src.generics && this, version);
#endif // HELMA
				// Define new static fields as enumerable, and inherit from base.
				// enumerable is necessary so they can be copied over from base,
				// and it does not disturb to be enumerable in the constructor.
#ifndef HELMA // !HELMA
				inject(this, src.statics, true, base);
#else // HELMA
				inject(this, src.statics, true, base, null, version);
				// For versioning, define onCodeUpdate to update _version each time:
				if (version) {
					// See if it is already defined, and override in a way that
					// allows outside definitions of onCodeUpdate to coexist with
					// Bootstrap.js. Use _wrapped to flag the function that
					// increases _version. Only override if it's another function
					// or if it is not defined yet.
					var update = proto.onCodeUpdate;
					if (!update || !update._wrapped) {
						var res = function(name) {
							// "this" points to the prototype here. Update its
							// constructor's _version
							this.constructor._version = (this.constructor._version || 0) + 1;
							// Call the previously defined funciton, if any
							if (update)
								update.call(this, name);
						};
						// Flag it so we know it the next time
						res._wrapped = true;
						proto.onCodeUpdate = res;
					}
					// Support for initialize in HopObject, in a way similar to
					// how native inheritance is handled: Produce an unnamed
					// closure as the constructor that checks for initialize and
					// calls it. Passing ctor.dont to it prevents that from
					// happening. Boots is relying on this to work.
					if (src.initialize) {
						var ctor = proto.constructor;
						ctor.dont = {};
						proto.constructor = function(dont) {
							if (proto.initialize && dont !== ctor.dont)
								return proto.initialize.apply(this, arguments);
						}
					}
				}
#endif // HELMA
			}
			// If there are more than one argument, loop through them and call
			// inject again. Do not simple inline the above code in one loop,
			// since each of the passed objects might override this.inject.
			for (var i = 1, l = arguments.length; i < l; i++)
				this.inject(arguments[i]);
			return this;
		},

		extend: function(src/* , ... */) {
			// The new prototype extends the constructor on which extend is called.
			// Fix constructor
#ifdef PROPERTY_DEFINITION
			var proto = new this(this.dont), ctor = extend(proto);
			define(proto, 'constructor', { value: ctor, writable: true, configurable: true });
#else // !PROPERTY_DEFINITION
			var proto = new this(this.dont), ctor = proto.constructor = extend(proto);
#endif // !PROPERTY_DEFINITION
			// An object to be passed as the first parameter in constructors
			// when initialize should not be called. This needs to be a property
			// of the created constructor, so that if .extend is called on native
			// constructors or constructors not created through .extend,
			// this.dont will be undefined and no value will be passed to the
			// constructor that would not know what to do with it.
			ctor.dont = {};
			// Copy over static fields, as prototype-like inheritance
			// is not possible for static fields. Mark them as enumerable
			// so they can be copied over again.
			// TODO: This needs fixing for versioning on the server!
			inject(ctor, this, true);
			// Inject all the definitions in src
			// Use the new inject instead of the one in ctor, in case it was
			// overriden.
			// Needed when overriding static inject as in HtmlElements.js.
			// Only inject if there's something to actually inject.
			return arguments.length ? this.inject.apply(ctor, arguments) : ctor;
		},

		pretend: function(fn) {
			// Redirect toString to the one from the original function
			// to "hide" the wrapper function
			this.toString = function() {
				return fn.toString();
			}
			this.valueOf = function() {
				return fn.valueOf();
			}
			return this;
		}
	});

	function each(obj, iter, bind) {
		return obj ? (typeof obj.length == 'number'
			? Array : Hash).prototype.each.call(obj, iter, bind) : bind;
	}

#ifdef EXTEND_OBJECT
	// From now on Function inject can be used to enhance any prototype,
	// for example Object.
	// Object is actually used for Base, and all JS objects inherit Bootstrap
	// functionality!
	Base = Object.inject({
#else // !EXTEND_OBJECT
	// Let's not touch Object.prototype
	Base = Object.extend({
#endif // !EXTEND_OBJECT
		/**
		 * Returns true if the object contains a property with the given name,
		 * false otherwise.
		 * Just like in .each, objects only contained in the prototype(s) are
		 * filtered.
		 */
		has: function(name) {
			return has(this, name);
		},

		each: function(iter, bind) {
			return each(this, iter, bind);
		},

		/**
		 * Injects the fields from the given object, adding base functionality
		 */
		inject: function(/* src, ... */) {
			for (var i = 0, l = arguments.length; i < l; i++)
				inject(this, arguments[i]);
			return this;
		},

		/**
		 * Returns a new object that inherits all properties from "this", through
		 * proper JS inheritance, not copying.
		 * Optionally, src and hide parameters can be passed to fill in the
		 * newly created object just like in inject(), to copy the behavior
		 * of Function.prototype.extend.
		 */
		extend: function(/* src, ... */) {
			// Notice the "new" here: the private extend returns a constructor
			// as it's used for Function.prototype.extend as well. But when
			// extending objects, we want to return a new object that inherits
			// from "this". In that case, the constructor is never used again,
			// its just created to create a new object with the proper
			// inheritance set and is garbage collected right after.
			var res = new (extend(this));
			return res.inject.apply(res, arguments);
		},

		statics: {
			// Expose some local privates as Base generics.
			has: has,
			each: each,
#ifdef PROPERTY_DEFINITION
			define: define,
			describe: describe,
#endif // PROPERTY_DEFINITION

			type: function(obj) {
#ifdef BROWSER
				// Handle elements, as needed by DomNode.js
				return (obj || obj === 0) && (
					obj._type || obj.nodeName && (
						obj.nodeType == 1 && 'element' ||
						obj.nodeType == 3 && 'textnode' ||
						obj.nodeType == 9 && 'document')
						// TODO: Find better way to identify windows and use
						// the same cod ein DomNode$getConstructor
						|| obj.location && obj.frames && obj.history && 'window'
						|| typeof obj) || null;
#else // !BROWSER
#ifdef RHINO
				// Return 'java' instead of 'object' for java objects, to easily
				// distinguish vanilla objects from native java ones. Filter out
				// JavaAdapters that implement Scriptable though, since we want
				// to be able to do some wrapping magic in Helma.
				return (obj || obj === 0) && (obj._type
					|| (obj instanceof java.lang.Object
						&& !(obj instanceof org.mozilla.javascript.Scriptable)
						? 'java' : typeof obj)) || null;
#else // !BROWSER && !RHINO
				return (obj || obj === 0) && (obj._type || typeof obj) || null;
#endif // !BROWSER && !RHINO
#endif // !BROWSER
			},

			check: function(obj) {
				return !!(obj || obj === 0);
			},

			/**
			 * Returns the first argument that is defined.
			 * Null is counted as defined too, since !== undefined is used for
			 * comparisons. In this it differs from Mootools!
			 */
			pick: function() {
				for (var i = 0, l = arguments.length; i < l; i++)
					if (arguments[i] !== undefined)
						return arguments[i];
				return null;
			},

			/**
			 * Converts the argument to an iterator function. If none is
			 * specified, the identity function is returned.
			 * This supports normal functions, which are returned unmodified,
			 * and values to compare to. Wherever this function is used in the
			 * Enumerable functions, a value, a Function or null may be passed.
			 */
			iterator: function(iter) {
				return !iter
					? function(val) { return val }
					: typeof iter != 'function'
						? function(val) { return val == iter }
						: iter;
				/*
				// For RegExp support, used this:
				else switch (Base.type(iter)) {
					case 'function': return iter;
					case 'regexp': return function(val) { return iter.test(val) };
					default: return function(val) { return val == iter };
				}
				*/
			},

			/**
			 * A special constant, to be thrown by closures passed to each()
			 *
			 * $continue / Base.next is not implemented, as the same
			 * functionality can achieved by using return in the closure.
			 * In prototype, the implementation of $continue also leads to a huge
			 * speed decrease, as the closure is wrapped in another closure that
			 * does nothing else than handling $continue.
			 */
			stop: {}
		}
	}, {
		generics: true,

#ifdef DEBUG
		debug: function() {
			return /^(string|number|function|regexp)$/.test(Base.type(this)) ? this
				: Base.each(this, function(val, key) { this.push(key + ': ' + val); }, []).join(', ');
			/*
			switch (Base.type(this)) {
			case 'string': case 'number': case 'regexp':
				return this;
			case 'function':
				return 'function ' + (this.name || '');
			}
			var buf = [];
			for (var key in this)
				if (Base.has(this, key))
					buf.push(key + ': ' + Base.debug(this[key]));
			return buf.join(', ');
			*/
		},
#endif !DEBUG

		/**
		 * Creates a new object of the same type and copies over all
		 * name / value pairs from this object.
		 */
		clone: function() {
			return Base.each(this, function(val, i) {
				this[i] = val;
			}, new this.constructor());
		},

		toQueryString: function() {
			return Base.each(this, function(val, key) {
#ifdef BROWSER
				this.push(key + '=' + encodeURIComponent(val));
#else // !BROWSER
				this.push(key + '=' + escape(val));
#endif // !BROWSER
			}, []).join('&');
		}
	});
}

#ifdef DEFINE_GLOBALS

$each = Base.each;
$type = Base.type;
$check = Base.check;
$pick = Base.pick;
$stop = $break = Base.stop;

#endif // DEFINE_GLOBALS

#endif // __lang_Base__