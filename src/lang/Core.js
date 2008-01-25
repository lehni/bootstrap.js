#ifndef __lang_Core__
#define __lang_Core__

/**
 * Bootstrap JavaScript Library
 * (c) 2006-2007 Juerg Lehni, http://scratchdisk.com/
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
// Core (inject / extend)

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

#ifdef BROWSER_LEGACY
// define undefined ;)
undefined = this.undefined;
#endif // BROWSER_LEGACY

new function() { // bootstrap
	/**
	 * Private function that injects functions from src into dest, overriding
	 * (and inherinting from) base. if allowProto is set, the name "prototype"
	 * is inherited too. This is false for static fields, as prototype there
	 * points to the classes' prototype.
	 */
#ifdef HELMA
	// Real base is used for the versioning mechanism as desribed above.
	function inject(dest, src, base, generics, version) {
#else // !HELMA
	function inject(dest, src, base, generics) {
#endif // !HELMA
#ifdef BROWSER_LEGACY
		// For some very weird reason, ""; fixes a bug on MACIE where .replace
		// sometimes would not be present when this meaningless emtpy string 
		// literal diappears... A theory is that defining an unassigned string
		// here pulls the extend String prototype into the scope...
		'';
#endif // BROWSER_LEGACY
		/**
		 * Private function that injects one field with given name
		 */
		function field(name, generics) {
			var val = src[name], res = val, prev = dest[name];
			if (val !== Object.prototype[name]) {
				switch (typeof val) {
					case 'function':
#ifdef GETTER_SETTER
						// Check if the function defines a getter or setter by looking
						// at its name. TODO: measure speed decrease of inject due to this!
						var match;
						if (match = name.match(/(.*)_(g|s)et$/)) {
							dest['__define' + match[2].toUpperCase() + 'etter__'](match[1], val);
							return;
						}
#endif // !GETTER_SETTER
						// Make generics first, as we might jump out bellow in the
						// val.valueOf() === prev.valueOf() check,
						// e.g. when explicitely reinjecting Array.prototype methods
						// to produce generics of them.
						if (generics) generics[name] = function(bind) {
							// Do not call Array.slice generic here, as on Safari,
							// this seems to confuse scopes (calling another
							// generic from generic-producing code).
							return bind && dest[name].apply(bind,
								Array.prototype.slice.call(arguments, 1));
						}
#ifdef RHINO
						if (/\[native code/.test(val))
							return;
#endif // RHINO
						if (prev && /\bthis\.base\b/.test(val)) {
#ifdef HELMA
							if (val.valueOf() === prev.valueOf()) return;
							// If the base function has already the _version field set, 
							// it is a function previously defined through inject. 
							// In this case, the value of _version decides what to do:
							// If we're in the same compilation cicle, Aspect behavior
							// is used.
							// Otherwise, fromBase is set to true, causing the closure
							// to look up the base value each time.
							var fromBase = base && base[name] == prev || prev._version && prev._version != version;
#else // !HELMA
							var fromBase = base && base[name] == prev;
#endif // !HELMA
							res = (function() {
								var tmp = this.base;
								// Look up the base function each time if we can,
								// to reflect changes to the base class after 
								// inheritance.
								this.base = fromBase ? base[name] : prev;
								try { return val.apply(this, arguments); }
								finally { this.base = tmp; }
							}).pretend(val);
#ifdef HELMA
							// If versioning is used, set the new version now.
							if (version) res._version = version;
#endif // HELMA
						}
						break;
					case 'object':
					case 'hash':
						// Merge hashes and objects
#ifdef HELMA // TODO: remove after debugging
						if (prev && prev != val)
							app.log(name + ' ' + prev + ' ' + val + ' ' + (val instanceof Object));
#endif // HELMA
						// Make sure it's a simple object and not something native
						if (prev && prev != val && val instanceof Object)
							res = Hash.merge({}, prev, val);
						break;
				}
				dest[name] = res;
#if defined(DONT_ENUM) || defined(HELMA)
				if (src._hide && dest.dontEnum)
					dest.dontEnum(name);
#endif // DONT_ENUM || HELMA
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
#ifdef DONT_ENUM
				if (visible(src, name) && !/^(toString|valueOf|statics|_generics|_hide)$/.test(name))
#elif !defined(HELMA)
				if (visible(src, name) && !/^(prototype|constructor|toString|valueOf|statics|_generics)$/.test(name))
#else // HELMA
				// On normal JS, we can hide statics through our dontEnum().
				// on Helma, the native dontEnum can only be called on fields
				// that are defined already, as an added attribute. So we need
				// to check against statics here...
				if (!/^(prototype|constructor|toString|valueOf|statics|_generics|_hide)$/.test(name))
#endif // HELMA
					field(name, generics);
			// Do not create generics for these:
			field('toString');
			field('valueOf');
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
			if (!this.__proto__) this.__proto__ = obj;
#endif // FIX_PROTO
			// Call the constructor function, if defined and we're not inheriting
			// in which case ctor.dont would be set, see further bellow.
			if (this.initialize && dont !== ctor.dont)
				return this.initialize.apply(this, arguments);
		}
		ctor.prototype = obj;
		return ctor;
	}

	/**
	 * Private function that checks if an object contains a given property.
	 * Naming it 'has' causes problems on Opera when defining
	 * Object.prototype.has, as the local version then seems to be overriden
	 * by that. Giving it a idfferent name fixes it.
	 */
	function visible(obj, name) {
#ifdef DONT_ENUM
		// This is tricky: as described in Object.prototype.dontEnum, the
		// _dontEnum  objects form a inheritance sequence between prototypes.
		// So if we check  obj._dontEnum[name], we're not sure that the
		// value returned is actually from the current object. It might be
		// from a parent in the inheritance chain. This is why dontEnum
		// stores a reference to the object on which dontEnum was called for
		// that object. If the value there differs from the one in obj, 
		// it means it was modified somewhere between obj and there.
		// If the entry allows overriding, we return true although _dontEnum
		// lists it.
		// We also need to detect if entries are actually _dontEnum entires
		// or fields stored in Object.prototype. Check wether they have the 
		// _object field set.
#ifdef BROWSER_LEGACY
		var val = obj[name], entry;
		return val !== undefined && (!(entry = obj._dontEnum && obj._dontEnum[name]) ||
				!entry._object || entry._allow && entry._object[name] !== val);
#else // !BROWSER_LEGACY
		var entry;
		return name in obj && (!(entry = obj._dontEnum && obj._dontEnum[name]) ||
				!entry._object || entry._allow && entry._object[name] !== obj[name]);
#endif // !BROWSER_LEGACY
#else // !DONT_ENUM
#ifndef HELMA
		// We need to filter out what does not belong to the object itself.
		// This is done by comparing the value with the value of the same
		// name in the prototype. If the value is equal it's defined in one
		// of the prototypes, not the object itself.
		// Also, key starting with __ are filtered out, as they are
		// iterators or legacy browser's function objects.
#ifdef EXTEND_OBJECT
		// We're extending Object, so we can assume __proto__ to always be there,
		// even when it's simulated on legacy browsers.
		return NAME_IS_VISIBLE(name, obj[name] !== obj.__proto__[name]);
#else // !EXTEND_OBJECT
		// Object.prototype is untouched, so we cannot assume __proto__ to always
		// be defined on legacy browsers.
		return NAME_IS_VISIBLE(name, (!obj.__proto__ || obj[name] !== obj.__proto__[name]));
#endif // !EXTEND_OBJECT
#else // HELMA
		return name in obj;
#endif // HELMA
#endif // !DONT_ENUM
	}

	// Now we can use the private inject to add methods to the Function.prototype
	inject(Function.prototype, {
		inject: function(src/*, ... */) {
			var proto = this.prototype, base = proto.__proto__ && proto.__proto__.constructor;
			// When called from extend, a third argument is passed, pointing
			// to the base class (the constructor).
			// this variable is needed for inheriting static fields and proper
			// lookups of base on each call (see bellow)
#ifdef HELMA
			// On the server side, we need some kind of version handling for
			// HopObjects because every time a prototype gets updated, the js
			// file is evaluated in the same scope again. Using Prototype.inject
			// in combination with base calls would result in a growing chain of
			// calls to previous versions if no version handling would be
			// involved.
			// The versions are used further up to determine wether the
			// previously defined function in the same prototype should be used
			// (AOP-like), or the same function in the real super prototype.
			// _version is only added to prototypes that inherit from HopObject,
			// and is automatically increased in onCodeUpdate, as defined bellow.
			var version = proto instanceof HopObject && (proto._version || (proto._version = 1));
#endif // HELMA
#ifndef HELMA // !HELMA
			inject(proto, src, base && base.prototype, src && src._generics && this);
#else // HELMA
			// Pass version
			inject(proto, src, base && base.prototype, src && src._generics && this, version);
#endif // HELMA
			// Define new static fields, and inherit from base.
#ifndef HELMA // !HELMA
			inject(this, src && src.statics, base);
#else // HELMA
			inject(this, src && src.statics, base, null, version);
			// For versioning, define onCodeUpdate to update _version each time:
			if (version) {
				// See if it is already defined, and override in a way that
				// allows outside definitions of onCodeUpdate to coexist with
				// Bootstrap.js. Use _version to flag the function that
				// increases _version. Only override if it's another function or
				// if it is not defined yet.
				var update = proto.onCodeUpdate;
				if (!update || !update._version) {
					var res = function(name) {
						// "this" points to the prototype here. Update its _version
						this._version++;
						// Call the previously defined funciton, if any
						if (update) update.call(this, name);
					};
					// Flag it so we know it the next time 
					res._version = true;
					proto.onCodeUpdate = res;
				}
				// Support for initialize in HopObject: just copy over:
				// We can do it that way, because the way HopObjects are defined
				// at the moment, we won't ever call HopObject.extend at the
				// moment (where proto.constructor is set).
				if (proto.initialize)
					proto.constructor = proto.initialize;
			}
#endif // HELMA
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
			var proto = new this(this.dont), ctor = proto.constructor = extend(proto);
#ifdef HELMA
			// On Helma, we can only dontEnum fields after they are set.
			proto.dontEnum('constructor');
#endif // HELMA
			// An object to be passed as the first parameter in constructors
			// when initialize should not be called. This needs to be a property
			// of the created constructor, so that if .extend is called on native
			// constructors or constructors not created through .extend,
			// this.dont will be undefined and no value will be passed to the
			// constructor that would not know what to do with it.
			ctor.dont = '';
			// Copy over static fields, as prototype-like inheritance
			// is not possible for static fields.
			// TODO: This needs fixing for versioning on the server!
			inject(ctor, this);
			// Inject all the definitions in src
			// Use the new inject instead of the one in ctor, in case it was
			// overriden.
			// Needed when overriding static inject as in HtmlElements.js.
#ifdef BROWSER_LEGACY
			// Do not rely on this.inject.apply, as this might not yet be defined
			// on legacy browsers yet. Pass on up to 6 src arguments.
			// This should be more than enough when extending using different
			// interfaces.
			ctor.inject = this.inject;
			var a = arguments;
			return ctor.inject(a[0], a[1], a[2], a[3], a[4], a[5]);
#else // !BROWSER_LEGACY
			return this.inject.apply(ctor, arguments);
#endif // !BROWSER_LEGACY
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

#ifdef EXTEND_OBJECT
	// From now on Function inject can be used to enhance any prototype,
	// for example Object.
	// Object is actually used for Base, and all JS objects inherit Bootstrap
	// functionality!
	Base = Object.inject({
#else // !EXTEND_OBJECT
	// Let's stay compatible with other libraries and not touch Object.prototype
	Base = Object.extend({
#endif // !EXTEND_OBJECT
#ifdef DONT_ENUM
		dontEnum: function(force) {
			// inherit _dontEnum with all its settings from prototype and extend.
			// _dontEnum objects form an own inheritance sequence, in parallel 
			// to the inheritance of the prototypes / objects they belong to. 
			// The sequence is only formed when dontEnum() is called, so there
			// might be problems with empty prototypes that get filled after
			// inheritance (very uncommon).
			// Here we check if getting _dontEnum on the object actually returns
			// the one of the parent. If it does, we create a new one by
			// extending the current one.
			// We cannot call proto._dontEnum.extend in Base.prototype.dontEnum,
			// as this is a dontEnum entry after calling
			// Object.prototype.dontEnum("extend"). Use the private function
			// instead. Each _dontEnum object has a property _object that points
			// to the object it belongs to. This makes it easy to check if we
			// need to extend _dontEnum for any given object dontEnum is
			// called on:
			/*
			// Alternative, when __proto__ works
			if (!this._dontEnum) this._dontEnum = {};
			else if (this.__proto__ && this._dontEnum === this.__proto__._dontEnum)
				this._dontEnum = new (extend(this._dontEnum));
			*/
			/*
			// The code bellow is a compressed form of this:
			if (!this._dontEnum) this._dontEnum = { _object: this };
			else if (this._dontEnum._object != this) {
				this._dontEnum = new (extend(this._dontEnum));
				this._dontEnum._object = this;
			}
			*/
			// note that without the parantheses around extend(d), new would not
			// create an instance of the returned constructor!
			var d = this._dontEnum = !(d = this._dontEnum) ? {} :
					d._object != this ? new (extend(d)) : d;
			d._object = this;
			for (var i = force == true ? 1 : 0; i < arguments.length; ++i)
				d[arguments[i]] = { _object: this, _allow: force != true };
		}
	});

	// Now that dontEnum is defined, use it to hide some fields:
	// First hide the fields that cannot be overridden (wether they change
	// value or not, they're allways hidden, by setting the first argument to true)
	Base.prototype.dontEnum(true, 'dontEnum', '_dontEnum', '__proto__',
		'prototype', 'constructor');

	// Now add some new fields, and hide these too.
	Base.inject({
#endif // DONT_ENUM
		HIDE
		/**
		 * Returns true if the object contains a property with the given name,
		 * false otherwise.
		 * Just like in .each, objects only contained in the prototype(s) are
		 * filtered.
		 */
		has: function(name) {
			return visible(this, name);
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
			// its just created to create a new object with the proper inheritance
			// set and is garbage collected right after.
			var res = new (extend(this));
			return res.inject.apply(res, arguments);
		}
	});
}

#endif // __lang_Core__