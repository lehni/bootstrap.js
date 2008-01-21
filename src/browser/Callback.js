#ifndef __browser_Callback__
#define __browser_Callback__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif

////////////////////////////////////////////////////////////////////////////////
// Callback

/**
 * Chain interface
 */
Chain = {
	chain: function(fn) {
		(this._chain = this._chain || []).push(fn);
		return this;
	},

	callChain: function() {
		if (this._chain && this._chain.length)
			this._chain.shift().apply(this, arguments);
		return this;
	},

	clearChain: function() {
		this._chain = [];
		return this;
	}
};

/**
 * Callback interface
 */
Callback = {
	addEvent: function(type, fn) {
		var ref = this.events = this.events || {};
		ref = ref[type] = ref[type] || [];
		// We need to pass an iterator function to find, as otherwise fn
		// is used as an iterator.
		if (!ref.find(function(val) { return val == fn })) ref.push(fn);
		return this;
	},

	addEvents: function(events) {
		return Base.each((events || []), function(fn, type) {
			this.addEvent(type, fn);
		}, this);
	},

	fireEvent: function(type, args, delay) {
		return (this.events && this.events[type] || []).each(function(fn) {
			fn.delay(delay, this, args);
		}, this);
	},

	removeEvent: function(type, fn) {
		if (this.events && this.events[type])
			this.events[type].remove(function(val) { return fn == val; });
		return this;
	},

	setOptions: function(opts) {
		// Keep copying this.options, as it might be defined in the prototype
		return (this.options = Hash.create(this.options, opts)).each(function(val, i) {
			if (typeof val == 'function' && (i = i.match(/^on([A-Z]\w*)/)))
				this.addEvent(i[1].toLowerCase(), val);
		}, this);
	}
};

#endif // __browser_Callback__