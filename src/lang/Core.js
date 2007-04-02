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
 * http://mootools.net/
 * http://prototypejs.org/
 */

////////////////////////////////////////////////////////////////////////////////
// Core (inject / extend)

// Fix __proto__ for browsers where it is not implemented. Do this before 
// anything else, for "var i in" to work.
#ifdef BROWSER_LEGACY
if (!this.__proto__) {
	var fix = [Object, Function, Number, Boolean, String, Array, Date, RegExp];
	for (var i in fix)
		fix[i].prototype.__proto__ = fix[i].prototype;
}

// define undefined ;)
undefined = window.undefined;
#endif // BROWSER_LEGACY

(function() { // bootstrap
	/**
	 * Private function that injects functions from src into dest, overriding
	 * (and inherinting from) base. if allowProto is set, the name "prototype"
	 * is inherited too. This is false for static fields, as prototype there
	 * points to the classes' prototype.
	 */
#ifdef HELMA
	// Real base is used for the versioning mechanism as desribed above.
	function inject(dest, src, base, hide, version, realBase) {
#else // !HELMA
	function inject(dest, src, base, hide) {
#endif // !HELMA
		// Iterate through all definitions in src with an iteator function
		// that checks if the field is a function that needs to be wrapped for
		// calls of $super. This is only needed if the function in base is
		// different from the one in src, and if the one in src is actually
		// calling base through $super. the string of the function is parsed
		// for $super to detect calls.
		// dest[name] then is set to either src[name] or the wrapped function.
#ifdef BROWSER_LEGACY
		// For some very weird reason, ""; fixes a bug on MACIE where .replace
		// sometimes would not be present when this meaningless emtpy string 
		// literal diappears... A theory is that defining an unassigned string
		// here pulls the extend String prototype into the scope...
		"";
#endif
		if (src) for (var name in src)
#ifdef HELMA
			// On normal JS, we can hide $static through our dontEnum().
			// on Helma, the native dontEnum can only be called on fields that
			// are defined and is not generally valid. So we need to check
			// against $static here...
			if (name != "$static") (function(val, name) {
#else // !HELMA
			if (!src.has || src.has(name)) (function(val, name) {
#endif // !HELMA
				/* TODO: decide what to do with this!
				if (typeof val == 'function' && /\$super\./.test(val)) {
					val = new Function(val.parameters(), val.body().replace(/\$super\./, 'this.__proto__.__proto__.'));
				}
				*/
				var res = val, baseVal = base && base[name];
				if (typeof val == 'function' && baseVal && val !== baseVal &&
					/\$super\b/.test(val)) {
#ifdef HELMA
					// If there is a realBase to read from, and the base
					// function has already the _version field set, it is a
					// function previously defined through inject. 
					// In this case, the value of _version decides what to do:
					// If we're in the same compilation cicle, AspectJ behavior
					// is used: $super then points to the function previously
					// defined in the same compilation cicle.
					// Otherwise, use the definition from realBase, as the
					// function points to an invalid version that was defined
					// in a previous compilation cicle and has since disappeared.
					// Like this, the result is allways as if the Helma app
					// was restarted after each changed and the client version
					// of base.js was used.
					if (realBase && base == dest && baseVal._version &&
						baseVal._version != version)
						base = realBase;
#endif // HELMA
					res = function() {
						var prev = this.$super;
						// Look up the $super function each time if we can,
						// to reflect changes to the base class after 
						// inheritance. this only works if inject is called
						// with the third argument (base), see code bellow.
						this.$super = base != dest ? base[name] : baseVal;
						try { return val.apply(this, arguments); }
						finally { this.$super = prev; }
					};
					// Redirect toString to the one from the original function
					// to "hide" the wrapper function
					res.toString = function() {
						return val.toString();
					};
#ifdef HELMA
					// If versioning is used, set the new version now.
					if (version)
						res._version = version;
#endif // HELMA
				}
				dest[name] = res;
				// Parameter hide was named dontEnum, but this caused 
				// problems on Opera, where it then seems to point to
				// Object.prototype.dontEnum, which must be a bug in Opera.
				if (hide && dest.dontEnum != null)
					dest.dontEnum(name);
			})(src[name], name);
		return dest;
	}

	function extend(obj) {
		// create the constructor for the new prototype that calls $constructor
		// if it is defined.
		var ctor = function() {
#ifdef LEGACY
			// fix __proto__
			this.__proto__ = obj;
#endif
			// call the constructor function, if defined and we're not inheriting
			// in which case ctor.dont would be set, see further bellow.
			if (this.$constructor && arguments[0] !== ctor.dont)
				return this.$constructor.apply(this, arguments);
		};
		ctor.prototype = obj;
		return ctor;
	}

	Function.prototype.inject = function(src, hide, base) {
		// When called from extend, a third argument is passed, pointing
		// to the base class (the constructor).
		// this variable is needed for inheriting static fields and proper lookups
		// of $super on each call (see bellow)
#ifdef HELMA
		var proto = this.prototype;
		// On the server side, we need some kind of version handling for HopObjects
		// Because every time a prototype gets updated, the js file is evaluated
		// in the same scope again. Using Prototype.inject in combination with
		// $super calls would result in a growing chain of calls to previous
		// versions if no version handling would be involved.
		// The versions are used further down to determine wether the previously
		// defined function in the same prototype should be used (AspectJ-like),
		// or the same function in the real super prototype (realBase) should be
		// used.
		// _version is only added to prototypes that inherit from HopObject, and
		// is automatically increased in onCodeUpdate, as defined bellow
		if (proto instanceof HopObject && !proto._version)
			proto._version = 1;
		var version = proto._version;
		// If versioning is used, retrieve the real base through __proto__:
		var realBase = version && proto.__proto__ && proto.__proto__.constructor;
#endif // HELMA
		// src can either be a function to be called, or a object literal.
		src = typeof src == 'function' ? src() : src;
		// Define new instance fields, and inherit from base, if available.
		// Otherwise inherit from ourself this works for also for functions in the
		// base class, as they are available through this.prototype. But if base
		// is not available, $super will not be looked up each time when it's
		// called (as this would result in an endless recursion). In this case,
		// the super class is "hard-coded" in the wrapper function, and	further
		// changes to it after inheritance are not reflected.
#ifndef HELMA // !HELMA
		inject(this.prototype, src, base ? base.prototype : this.prototype, hide);
#else // HELMA
		// Pass realBase if defined.
		inject(proto, src, base ? base.prototype : proto, hide, version, realBase && realBase.prototype);
#endif // HELMA
		// Copy over static fields from base, as prototype-like inheritance is not
		// possible for static fields. If base is null, this does nothing.
		// TODO: This needs fixing for versioning on the server!
		// Do not set dontEnum for static, as otherwise we won't be able to inject 
		// static fields from base next time
		inject(this, base);
		// Define new static fields, and inherit from base.
#ifndef HELMA // !HELMA
		return inject(this, src.$static, base);
#else // HELMA
		// Again, pass realBase if defined.
		inject(this, src.$static, base, false, version, realBase);
		// For versioning, define onCodeUpdate to update _version each time:
		if (version) {
			// See if it is already defined, and override in a way that allows
			// outside definitions of onCodeUpdate to coexist with base.
			// Use _version to flag the function that increases _version.
			// Only override if it's another function or if it is not defined yet.
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
			// Support for $constructor in HopObject: just copy over:
			// We can do it that way, because the way HopObjects are defined
			// at the moment, we won't ever call HopObject.extend at the moment
			// (where proto.constructor is set).
			if (proto.$constructor)
				proto.constructor = proto.$constructor;
		}
		return this;
#endif // HELMA
	};

	Function.prototype.extend = function(src, hide) {
		// The new prototype extends the constructor on which extend is called.
		var ctor = extend(new this(this.dont));
		// fix constructor
		ctor.prototype.constructor = ctor;
		// An object to be passed as the first parameter in constructors
		// when $constructor should not be called. This needs to be a property
		// of the created constructor, so that if .extend is called on native
		// constructors or constructors not created through .extend, this.dont
		// will be undefined and no value will be passed to the constructor that
		// would not know what to do with it.
		ctor.dont = {};
		// and inject all the definitions in src
		// pass inject on before it's executed, in case it was overriden.
		// Needed in Collection.js
		return this.inject.call(ctor, src, hide, this);
	};

#ifndef HELMA
	Object.prototype.dontEnum = function(force) {
		// inherit _dontEnum with all its settings from prototype and extend.
		// _dontEnum objects form an own inheritance sequence, in parallel to 
		// the inheritance of the prototypes / objects they belong to. The 
		// sequence is only formed when dontEnum() is called, so there might
		// be problems with empty prototypes that get filled after inheritance
		// (very uncommon).
		// Here we check if getting _dontEnum on the object actually returns the
		// one of the parent. If it does, we create a new one by extending the
		// current one.
		// We cannot call proto._dontEnum.extend in Object.prototype.dontEnum,
		// as this is a dontEnum entry after calling
		// Object.prototype.dontEnum("extend"). Use the private function instead.
		// Each _dontEnum object has a property _object that points to the
		// object it belongs to. This makes it easy to check if we need to extend
		// _dontEnum for any given object dontEnum is called on:
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
		for (var i = force == true ? 1 : 0; i < arguments.length; i++)
			d[arguments[i]] = { object: this, allow: force != true };
	};

	// First dontEnum the fields that cannot be overridden (wether they change
	// value or not, they're allways hidden, by setting the first argument to true)
	// TODO: Fix this bug in Rhino:
	// "prototype" is only needed for Rhino, where e.g. for (var i in Function)
	// enumerates "prototype", while it shouldn't.
	Object.prototype.dontEnum(true, "dontEnum", "_dontEnum", "__proto__",
		"prototype", "constructor", "$static");
#endif // !HELMA

	// From now on Function inject can be used to enhance any prototype, for example
	// Object:
	Object.inject({
		/**
		 * Returns true if the object contains a property with the given name,
		 * false otherwise.
		 * Just like in .each, objects only contained in the prototype(s) are filtered.
		 */
		has: function(name) {
#ifndef HELMA // !HELMA
			// This is tricky: as described in Object.prototype.dontEnum, the
			// _dontEnum  objects form a inheritance sequence between prototypes.
			// So if we check  this._dontEnum[name], we're not sure that the
			// value returned is actually from the current object. It might be
			// from a parent in the inheritance chain. This is why dontEnum
			// stores a reference to the object on which dontEnum was called for
			// that object. If the value there differs from the one in "this", 
			// it means it was modified somewhere between "this" and there.
			// If the entry allows overriding, we return true although _dontEnum
			// lists it.
#ifdef BROWSER_LEGACY
			var val = this[name], entry;
			return val !== undefined && (!(entry = this._dontEnum[name]) ||
				entry.allow && entry.object[name] !== val)
#else // !BROWSER_LEGACY
			var entry;
			return name in this && (!(entry = this._dontEnum[name]) ||
				entry.allow && entry.object[name] !== this[name])
#endif // !BROWSER_LEGACY
#else // HELMA
			return name in this;
#endif // HELMA
		},

		/**
		 * Injects the fields from the given object, adding $super functionality
		 */
		inject: function(src, hide) {
			return inject(this, src, this, hide);
		},

		/**
		 * Returns a new object that inherits all properties from "this", through
		 * proper JS inheritance, not copying.
		 * Optionally, src and hide parameters can be passed to fill in the
		 * newly created object just like in inject(), to copy the behavior
		 * of Function.prototype.extend.
		 */
		extend: function(src, hide) {
			// notice the "new" here: the private extend returns a constructor
			// as it's used for Function.prototype.extend as well. But when 
			// extending objects, we want to return a new object that inherits
			// from "this". In that case, the constructor is never used again,
			// its just created to create a new object with the proper inheritance
			// set and is garbage collected right after.
			return (new (extend(this))).inject(src, hide);
		}
	}, true);
})();

function $typeof(obj) {
#ifdef BROWSER
	// handle elements, as needed by Element.js
	return obj && ((obj._type || obj.nodeName && obj.nodeType == 1 && 'element') || typeof obj) || undefined;
#else // !BROWSER
	return obj && (obj._type || typeof obj) || undefined;
#endif // !BROWSER
}

// TODO: consider moving this somewhere more appropriate
function $random(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}