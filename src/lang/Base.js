//#ifndef __lang_Base__
//#define __lang_Base__

/**
 * Bootstrap JavaScript Library
 * (c) 2006 - 2011 Juerg Lehni, http://lehni.org/
 *
 * Bootstrap is released under the MIT license
 * http://bootstrapjs.org/
 *
 * Inspirations:
 * http://dean.edwards.name/weblog/2006/03/base/
 * http://dev.helma.org/Wiki/JavaScript+Inheritance+Sugar/
 * http://prototypejs.org/
//#ifdef CORE_ONLY
 */
//#else // !CORE_ONLY
 * http://mootools.net/
 *
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 */

////////////////////////////////////////////////////////////////////////////////
// Base
//#endif // !CORE_ONLY

var Base = new function() { // Bootstrap scope
//#ifdef FIX_PROTO
	// Fix __proto__ for browsers where it is not implemented (IE and Opera).
//#ifdef CORE_ONLY
	var fix = !this.__proto__,
//#else // !CORE_ONLY
	// Do this before anything else, for "var i in" to work without filtering.
//#ifdef EXTEND_OBJECT
	var fix = !this.__proto__ && [Object, Function, Number, Boolean, String,
			Array, Date, RegExp];
//#else // !EXTEND_OBJECT
	var fix = !this.__proto__ && [Function, Number, Boolean, String, Array,
			Date, RegExp];
//#endif // !EXTEND_OBJECT
	if (fix)
		for (var i in fix)
			fix[i].prototype.__proto__ = fix[i].prototype;
//#endif // !CORE_ONLY
		hidden = /^(HIDDEN_FIELDS)$/,
//#else // !FIX_PROTO
	var hidden = /^(HIDDEN_FIELDS)$/,
//#endif // !FIX_PROTO
//#comment ALL
		proto = Object.prototype,
		/**
		 * Private function that checks if an object contains a given property.
		 * Naming it 'has' causes problems on Opera when defining
		 * Object.prototype.has, as the local version then seems to be overriden
		 * by that. Giving it a idfferent name fixes it.
		 */
//#ifdef ECMASCRIPT_3
//#ifdef FIX_PROTO
		has = fix
			? function(name) {
				return name !== '__proto__' && this.hasOwnProperty(name);
			}
			: proto.hasOwnProperty,
//#else // !FIX_PROTO
		has = proto.hasOwnProperty,
//#endif // !FIX_PROTO
//#else // !ECMASCRIPT_3
	// Check if environment supports hasOwnProperty, and use a differnt version
	// of has if ti does, for higher performance as checking on each has() call.
	// All Browsers that need FIX_PROTO (IE and Opera) have hasOwnProperty, so
	// the version without hasOwnProperty does not need to check for __proto__
		has = proto.hasOwnProperty
//#ifdef FIX_PROTO
			? fix
				? function(name) {
					return name !== '__proto__' && this.hasOwnProperty(name);
				}
				: proto.hasOwnProperty
//#else // !FIX_PROTO
			? proto.hasOwnProperty
//#endif // !FIX_PROTO
			: function(name) {
				// We need to filter out what does not belong to the object
				// itself. This is done by comparing the value with the value of
				// the same name in the prototype. If the value is equal it's
				// defined in one of the prototypes, not the object itself.
//#ifdef EXTEND_OBJECT
				// We're extending Object, so we can assume __proto__ to always
				// be there, even when it's simulated on browsers not supporting
				// it.
				return this[name] !== this.__proto__[name];
//#else // !EXTEND_OBJECT
				// Object.prototype is untouched, so we cannot assume __proto__
				// to always be defined on legacy browsers.
				return this[name] !== (this.__proto__ || Object.prototype)[name];
//#endif // !EXTEND_OBJECT
			},
//#endif // !ECMASCRIPT_3
//#comment ALL
//#ifdef CORE_ONLY
//#comment We're not extending the JS Core classes, so reference isArray here
//#comment and use it in each() further down instead of Base.type() == 'array'
		toString = proto.toString,
		proto = Array.prototype,
		isArray = Array.isArray = Array.isArray || function(obj) {
			return toString.call(obj) === '[object Array]';
		},
//#else // !CORE_ONLY
		proto = Array.prototype,
//#endif // !CORE_ONLY
		slice = proto.slice,
		forEach = proto.forEach = proto.forEach || function(iter, bind) {
			for (var i = 0, l = this.length; i < l; i++)
				iter.call(bind, this[i], i, this);
		},
		forIn = function(iter, bind) {
			// Do not use Object.keys for iteration as iterators might modify
			// the object we're iterating over, making the hasOwnProperty still
			// necessary.
//#ifdef PROPERTY_DEFINITION
//#comment If PROPERTY_DEFINITION is used, we can fully rely on hasOwnProperty,
//#comment as even for FIX_PROTO, define(this, '__proto__', {}) is used.
//#comment And we can rely on define() making __proto__ non-enumerable when
//#comment this fix is required, as this only happens on IE, where
//#comment Object.defineProperty is used.
//#comment TODO: This is not true though for the case where we support both
//#comment PROPERTY_DEFINITION and also want to fail back gracefully on
//#comment older browsers.
			for (var i in this)
				if (this.hasOwnProperty(i))
					iter.call(bind, this[i], i, this);
//#else // !PROPERTY_DEFINITION
			// Rely on has instead of hasOwnProperty directly.
			for (var i in this)
				if (has.call(this, i))
					iter.call(bind, this[i], i, this);
//#endif // !PROPERTY_DEFINITION
//#ifdef PROPERTY_DEFINITION
//#ifdef ECMASCRIPT_5
// ECMAScript version 5 compliant engines such as Rhino
//#comment close forIn() from above:
		};

	// Use the standard Object.defineProperty
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
			return has.call(obj, name)
				? { value: obj[name], enumerable: true, configurable: true,
						writable: true }
				: null;
		}
	}
//#else // !ECMASCRIPT_5
//#comment close forIn() from above:
		},
		_define = Object.defineProperty,
		_describe = Object.getOwnPropertyDescriptor;

	// Support a mixed environment of some ECMAScript 5 features present,
	// along with __defineGetter/Setter__ functions, as found in browsers today.
	function define(obj, name, desc) {
		// Unfortunately Safari seems to ignore configurable: true and
		// does not override existing properties, so we need to delete
		// first:
		if (_define) {
			try {
				delete obj[name];
				return _define(obj, name, desc);
			} catch (e) {}
		}
		if ((desc.get || desc.set) && obj.__defineGetter__) {
			desc.get && obj.__defineGetter__(name, desc.get);
			desc.set && obj.__defineSetter__(name, desc.set);
		} else {
			obj[name] = desc.value;
		}
		return obj;
	}

	function describe(obj, name) {
		if (_describe) {
			try {
				return _describe(obj, name);
			} catch (e) {}
		}
		var get = obj.__lookupGetter__ && obj.__lookupGetter__(name);
		return get
			? { get: get, set: obj.__lookupSetter__(name), enumerable: true,
					configurable: true }
			: has.call(obj, name)
				? { value: obj[name], enumerable: true, configurable: true,
						writable: true }
				: null;
	}
//#endif // !ECMASCRIPT_5
//#else // !PROPERTY_DEFINITION
//#comment close forIn() from above:
		};
//#endif // !PROPERTY_DEFINITION

	/**
	 * Private function that injects functions from src into dest, overriding
	 * (and inherinting from) base.
	 */
//#ifdef HELMA
	// Real base is used for the versioning mechanism as desribed above.
	function inject(dest, src, enumerable, base, preserve, generics, version) {
//#else // !HELMA
	function inject(dest, src, enumerable, base, preserve, generics) {
//#endif // !HELMA
//#ifdef BEANS
		var beans, bean;
//#endif // BEANS

		/**
		 * Private function that injects one field with given name and checks if
		 * the field is a function that needs to be wrapped for calls of base().
		 * This is only needed if the function in base is different from the one
		 * in src, and if the one in src is actually calling base through base.
		 * The string of the function is parsed for this.base to detect calls.
		 */
//#ifdef BEANS
//#comment For beans we need to provide a version of field() that takes an
//#comment optional val argument. See bellow.
		function field(name, val, dontCheck, generics) {
			// This does even work for prop: 0, as it will just be looked up
			// again through describe.
//#comment Only the first line of variable definitions is special fo beans, the
//#comment rest is shared with PROPERTY_DEFINITION bellow
			var val = val || (val = describe(src, name))
					&& (val.get ? val : val.value),
//#else // !BEANS
		function field(name, dontCheck, generics) {
//#endif // !BEANS
//#ifdef PROPERTY_DEFINITION // || BEANS (PROPERTY_DEFINITION always with BEANS)
//#ifndef BEANS
			var val = (val = describe(src, name)) && (val.get ? val : val.value),
//#endif // !BEANS
				func = typeof val === 'function',
				res = val,
				// Only lookup previous value if we preserve or define a
				// function that might need it for this.base(). If we're
				// defining a getter, don't lookup previous value, but look if
				// the property exists (name in dest) and store result in prev
				prev = preserve || func
					? (val && val.get ? name in dest : dest[name]) : null;
//#else // !PROPERTY_DEFINITION
			var val = src[name],
				func = typeof val === 'function',
				res = val,
				prev = dest[name];
//#endif // !PROPERTY_DEFINITION
			// Make generics first, as we might jump out bellow in the
			// val !== (src.__proto__ || Object.prototype)[name] check,
			// e.g. when explicitely reinjecting Array.prototype methods
			// to produce generics of them.
			if (generics && func && (!preserve || !generics[name])) {
				generics[name] = function(bind) {
					// Do not call Array.slice generic here, as on Safari,
					// this seems to confuse scopes (calling another
					// generic from generic-producing code).
					return bind && dest[name].apply(bind,
							slice.call(arguments, 1));
				}
			}
//#comment TODO: On proper JS implementation, dontCheck is always set
//#comment Add this with a compile switch here!
			if ((dontCheck || val !== undefined && has.call(src, name))
					&& (!preserve || !prev)) {
				if (func) {
					if (prev && /\bthis\.base\b/.test(val)) {
//#ifdef HELMA
						// If the base function has already the _version field
						// set, it is a function previously defined through
						// inject. In this case, the value of _version decides
						// what to do:
						// If we're in the same compilation cicle, Aspect
						// behavior is used, by continuously referencing the
						// previously defined functions in the same cicle.
						// Otherwise, the real previous function is fetched from
						// _previous, making sure we do not end up in
						// aspect-like changes of the multiple instances of the
						// same function, compiled in different cicles.
						// Since Helma always recompiles code from all
						// repositories for a given prototype when a change
						// happens in one of them, we also need to compare dest,
						// and skip backwards until we find the first version
						// that  is not compiled for this prototype (== dest).
						// Otherwise we would produce referential loops.
						while (prev._version && prev._version != version
								&& prev._dest == dest)
							prev = prev._previous;
//#endif // HELMA
						var fromBase = base && base[name] == prev;
						res = function() {
							// Look up the base function each time if we can,
							// to reflect changes to the base class after
							// inheritance.
//#ifdef PROPERTY_DEFINITION
							var tmp = describe(this, 'base');
							define(this, 'base', { value: fromBase
								? base[name] : prev, configurable: true });
							try {
								return val.apply(this, arguments);
							} finally {
								tmp ? define(this, 'base', tmp)
									: delete this.base;
							}
//#else // !PROPERTY_DEFINITION
							var tmp = this.base;
							this.base = fromBase ? base[name] : prev;
							try {
								return val.apply(this, arguments);
							} finally {
								tmp ? this.base = tmp
									: delete this.base;
							}
//#endif // !PROPERTY_DEFINITION
						};
						// Make wrapping closure pretend to be the original
						// function on inspection
						res.toString = function() {
							return val.toString();
						}
						res.valueOf = function() {
							return val.valueOf();
						}
//#ifdef HELMA
						// If versioning is used, set the new version now, and
						// keep a reference to the real previous function, as
						// used in the code above.
						if (version) {
							res._version = version;
							res._previous = prev;
							// Store this function's destination as well, since
							// it is needed when searching for the right
							// previous version of a function when code is
							// updated. See above.
							res._dest = dest;
						}
//#endif // HELMA
					}
//#ifdef BEANS
					// Produce bean properties if getters are specified. This
					// does not produce properties for setter-only properties.
					// Just collect beans for now, and look them up in dest at
					// the end of fields injection. This ensures this.base()
					// works in beans too, and inherits setters for redefined
					// getters in subclasses. Only add getter beans if they do
					// not expect arguments. Functions that should function both
					// with optional arguments and as beans should not declare
					// the parameters and use the arguments array internally
					// instead.
					if (beans && val.length == 0
							&& (bean = name.match(/^(get|is)(([A-Z])(.*))$/)))
						beans.push([ bean[3].toLowerCase() + bean[4], bean[2] ]);
//#endif // BEANS
				}
//#ifdef PROPERTY_DEFINITION
				// No need to look up getter if this is a function already.
//#comment This also prevents Helma's _collection from becoming a getter, as
//#comment DomElements is a constructor function and has both get / set
//#comment generics for DomElement#get / #set.
//#ifdef RHINO
				if (!res || func || res instanceof java.lang.Object
						|| !res.get && !res.set)
//#else // !RHINO
				if (!res || func || !res.get && !res.set)
//#endif // !RHINO
					res = { value: res, writable: true };
				// Only set/change configurable and enumerable if this field is
				// configurable
				if ((describe(dest, name)
						|| { configurable: true }).configurable) {
					res.configurable = true;
					res.enumerable = enumerable;
				}
				define(dest, name, res);
//#else // !PROPERTY_DEFINITION
				dest[name] = res;
//#endif // !PROPERTY_DEFINITION
			}
		}
		// Iterate through all definitions in src now and call field() for each.
		if (src) {
//#ifdef BEANS
//#ifdef BEANS_OLD
			// Support old and new format of bean flag.
			beans = (src.beans || src._beans) && [];
//#else // !BEANS_OLD
			beans = src.beans && [];
//#endif // !BEANS_OLD
//#endif // BEANS
			for (var name in src)
				if (has.call(src, name) && !hidden.test(name))
//#ifdef BEANS
					field(name, null, true, generics);
//#else // !BEANS
					field(name, true, generics);
//#endif // !BEANS
//#ifdef BROWSER
			// IE (and some other browsers?) never enumerate these, even  if
			// they are simply set on an object. Force their creation. Do not
			// create generics for these, and check them for not being defined
			// (by passing undefined for dontCheck).
			field('toString');
			field('valueOf');
//#endif // BROWSER
//#ifdef BEANS
			// Now finally define beans as well. Look up methods on dest, for
			// support of this.base() (See above).
			for (var i = 0, l = beans && beans.length; i < l; i++)
				try {
					var bean = beans[i], part = bean[1];
					field(bean[0], {
						get: dest['get' + part] || dest['is' + part],
						set: dest['set' + part]
					}, true);
				} catch (e) {}
//#endif // BEANS
		}
		return dest;
	}

	/**
	 * Private function that creates a constructor to extend the given object.
	 * When this constructor is called through new, a new object is craeted
	 * that inherits all from obj.
	 */
	function extend(obj) {
		// Create the constructor for the new prototype that calls initialize
		// if it is defined.
		var ctor = function(dont) {
//#ifdef FIX_PROTO
			// Fix __proto__
//#ifdef PROPERTY_DEFINITION
			if (fix) define(this, '__proto__', { value: obj });
//#else // !PROPERTY_DEFINITION
			if (fix) this.__proto__ = obj;
//#endif // !PROPERTY_DEFINITION
//#endif // FIX_PROTO
			// Call the constructor function, if defined and we are not
			// inheriting, in which case ctor.dont would be set, see bellow.
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

	/**
	 * Converts the argument to an iterator function. If none is specified, the
	 * identity function is returned.
	 * This supports normal functions, which are returned unmodified, and values
	 * to compare to. Wherever this function is used in the Enumerable
	 * functions, a value, a Function or null may be passed.
	 */
	function iterator(iter) {
		return !iter
			? function(val) { return val }
			: typeof iter !== 'function'
				? function(val) { return val == iter }
				: iter;
//#comment For RegExp support, used something like this:
//#comment	switch (Base.type(iter)) {
//#comment		case 'function': return iter;
//#comment		case 'regexp': return function(val) { return iter.test(val) };
//#comment		default: return function(val) { return val == iter };
//#comment	}
	}

	function each(obj, iter, bind, asArray) {
		try {
			if (obj)
//#comment See above in explanations about isArray:
//#ifdef CORE_ONLY
				(asArray || asArray === undefined && isArray(obj)
//#else // !CORE_ONLY
				(asArray || asArray === undefined && Base.type(obj) == 'array'
//#endif // !CORE_ONLY
					? forEach : forIn).call(obj, iterator(iter),
						bind = bind || obj);
		} catch (e) {
			if (e !== Base.stop) throw e;
		}
		return bind;
	}

	function clone(obj) {
		return each(obj, function(val, i) {
			this[i] = val;
		}, new obj.constructor());
	}

//#ifdef CORE_ONLY
	// Inject into new ctor object that's passed to inject(), and then returned
	return inject(function() {}, {
//#else // !CORE_ONLY
	// Now we can use the private inject to add methods to Function.prototype
	inject(Function.prototype, {
//#endif // !CORE_ONLY
		inject: function(src/*, ... */) {
			if (src) {
				var proto = this.prototype,
					base = proto.__proto__ && proto.__proto__.constructor,
					// Allow the whole scope to just define statics by defining
					// statics: true.
					statics = src.statics == true ? src : src.statics;
//#ifdef HELMA
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
						&& (proto.constructor._version
						|| (proto.constructor._version = 1));
//#endif // HELMA
				if (statics != src)
					inject(proto, src, src.enumerable, base && base.prototype,
//#ifndef HELMA // !HELMA
							src.preserve, src.generics && this);
//#else // HELMA // Pass version
							src.preserve, src.generics && this, version);
//#endif // HELMA
				// Define new static fields as enumerable, and inherit from
				// base. enumerable is necessary so they can be copied over from
				// base, and it does not harm to have enumerable properties in
				// the constructor. Use the preserve setting in src.preserve for
				// statics too, not their own.
//#ifndef HELMA // !HELMA
				inject(this, statics, true, base, src.preserve);
//#else // HELMA
				inject(this, statics, true, base, src.preserve, null, version);
				// For versioning, define onCodeUpdate to update _version each
				// time:
				if (version) {
					// See if it is already defined, and override in a way that
					// allows outside definitions of onCodeUpdate to coexist
					// with Bootstrap.js. Use _wrapped to flag the function that
					// increases _version. Only override if it's another
					// function or if it is not defined yet.
					var update = proto.onCodeUpdate;
					if (!update || !update._wrapped) {
						var res = function(name) {
							// "this" points to the prototype here. Update its
							// constructor's _version
							this.constructor._version =
								(this.constructor._version || 0) + 1;
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
//#endif // HELMA
			}
			// If there are more than one argument, loop through them and call
			// inject again. Do not simple inline the above code in one loop,
			// since each of the passed objects might override this.inject.
			for (var i = 1, l = arguments.length; i < l; i++)
				this.inject(arguments[i]);
			return this;
		},

		extend: function(src/* , ... */) {
			// The new prototype extends the constructor on which extend is
			// called. Fix constructor.
			// TODO: Consider using Object.create instead of using this.dont if
			// available?
//#ifdef PROPERTY_DEFINITION
			var proto = new this(this.dont),
				ctor = extend(proto);
			define(proto, 'constructor',
					{ value: ctor, writable: true, configurable: true });
//#else // !PROPERTY_DEFINITION
			var proto = new this(this.dont),
				ctor = proto.constructor = extend(proto);
//#endif // !PROPERTY_DEFINITION
			// Define an object to be passed as the first parameter in
			// constructors when initialize should not be called.
//#comment This needs to be a property on the created constructor, so that if
//#comment .extend() is called on native constructors or constructors not
//#comment created through .extend, this.dont will be undefined and no value
//#comment will be passed to the constructor that would not know what to do
//#comment with it.
			ctor.dont = {};
			// Copy over static fields, as prototype-like inheritance
			// is not possible for static fields. Mark them as enumerable
			// so they can be copied over again.
//#comment TODO: This needs fixing for versioning on the server!
			inject(ctor, this, true);
			// Inject all the definitions in src. Use the new inject instead of
			// the one in ctor, in case it was overriden. this is needed when
			// overriding the static .inject(). But only inject if there's
			// something to actually inject.
			return arguments.length ? this.inject.apply(ctor, arguments) : ctor;
		}
//#ifdef CORE_ONLY
		// Pass true for enumerable, so inject() and extend() can be passed on
		// to subclasses of Base through Base.inject() / extend().
	}, true).inject({
//#else // !CORE_ONLY
	});
//#ifdef EXTEND_OBJECT
	// From now on Function inject can be used to enhance any prototype,
	// for example Object.
	// Object is actually used for Base, and all JS objects inherit Bootstrap
	// functionality!
	return Object.inject({
//#else // !EXTEND_OBJECT
	// Let's not touch Object.prototype
	return Object.extend({
//#endif // !EXTEND_OBJECT
//#endif // !CORE_ONLY
		/**
		 * Returns true if the object contains a property with the given name,
		 * false otherwise.
		 * Just like in .each, objects only contained in the prototype(s) are
		 * filtered.
		 */
		has: has,
		each: each,

		/**
		 * Injects the fields from the given object, adding this.base()
		 * functionality
		 */
		inject: function(/* src, ... */) {
			for (var i = 0, l = arguments.length; i < l; i++)
				inject(this, arguments[i], arguments[i].enumerable);
			return this;
		},

		/**
		 * Returns a new object that inherits all properties from "this",
		 * through proper JS inheritance, not copying.
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

		each: function(iter, bind) {
			return each(this, iter, bind);
		},

		/**
		 * Creates a new object of the same type and copies over all
		 * name / value pairs from this object.
		 */
		clone: function() {
			return clone(this);
		},

		statics: {
			// Expose some local privates as Base generics.
			each: each,
			clone: clone,
//#ifdef PROPERTY_DEFINITION
			define: define,
			describe: describe,
//#endif // PROPERTY_DEFINITION
			iterator: iterator,

			has: function(obj, name) {
				return has.call(obj, name);
			},

			type: function(obj) {
//#if defined(BROWSER) && !defined(CORE_ONLY)
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
//#else // !BROWSER || CORE_ONLY
//#ifdef RHINO
				// Return 'java' instead of 'object' for java objects, to easily
				// distinguish vanilla objects from native java ones.
				return (obj || obj === 0) && (obj._type
					|| (obj instanceof java.lang.Object ? 'java' : typeof obj))
					|| null;
//#else // !RHINO
				return (obj || obj === 0) && (obj._type || typeof obj) || null;
//#endif // !RHINO
//#endif // !BROWSER || CORE_ONLY
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
			 * A special constant, to be thrown by closures passed to each()
			 * 
			 * $continue / Base.next is not implemented, as the same
			 * functionality can achieved by using return in the closure.
			 * In prototype, the implementation of $continue also leads to a
			 * huge speed decrease, as the closure is wrapped in another closure
			 * that does nothing else than handling $continue.
			 */
			stop: {}
		}
	});
}

//#ifdef DEFINE_GLOBALS

var $each = Base.each,
	$type = Base.type,
	$check = Base.check,
	$pick = Base.pick,
	$stop = Base.stop,
	$break = $stop;

//#endif // DEFINE_GLOBALS

//#endif // __lang_Base__