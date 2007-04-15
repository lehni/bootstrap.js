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
var Chain = {
	chain: function(fn) {
		(this.chains = this.chains || []).push(fn);
		return this;
	},

	callChain: function() {
		// TODO: delay needed?
		if (this.chains && this.chains.length)
			this.chains.shift().delay(1, this);
	},

	clearChain: function() {
		this.chains = [];
	}
};

/**
 * Callback interface
 */
var Callback = {
	addEvent: function(type, fn) {
		var ref = this.events = this.events || {};
		ref = ref[type] = ref[type] || [];
		if (!ref.contains(fn)) ref.push(fn);
		return this;
	},

	fireEvent: function(type) {
		return (this.events && this.events[type] || []).each(function(fn) {
			fn.apply(this, $A(arguments, 1));
		}, this);
	},

	removeEvent: function(type, fn) {
		if (this.events && this.events[type]) this.events[type].remove(fn);
		return this;
	},

	setOptions: function(opts) {
		// Keep copying this.options, as it might be defined in the prototype
		return (this.options = $H(this.options)).merge(opts).each(function(val, i) {
			if (typeof val == 'function' && (i = i.match(/^on([A-Z]\w*)/)))
				this.addEvent(i[1].toLowerCase(), val);
		}, this);
	}
};

#endif // __browser_Callback__