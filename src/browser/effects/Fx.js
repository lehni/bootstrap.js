//#ifndef __browser_effects_Fx__
//#define __browser_effects_Fx__

//#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 */
//#endif // HIDDEN

//#include "../Callback.js"

////////////////////////////////////////////////////////////////////////////////
// Fx

// Mootools uses #setNow to define the current value and #increase to set them
// Bootstrap relies instead on #update that recieves a value to set and #get
// to retrieve the current value. Any class extending Fx needs to define these.

var Fx = Base.extend(Chain, Callback, {
	options: {
		fps: 50,
		unit: false,
		duration: 500,
		wait: true,
		transition: function(p) {
			return -(Math.cos(Math.PI * p) - 1) / 2;
		}
	},

	initialize: function(element, options) {
		this.element = DomElement.get(element);
		this.setOptions(options);
	},

	step: function() {
		var time = Date.now();
		if (time < this.time + this.options.duration) {
			this.delta = this.options.transition((time - this.time) / this.options.duration);
			this.update(this.get());
		} else {
			this.stop(true);
			this.update(this.to);
			this.fireEvent('complete', [this.element]).callChain();
		}
	},

	set: function(to) {
		this.update(to);
		this.fireEvent('set', [this.element]);
		return this;
	},

	get: function() {
		return this.compute(this.from, this.to);
	},

	compute: function(from, to) {
		return (to - from) * this.delta + from;
	},

	start: function(from, to) {
		if (!this.options.wait) this.stop();
		else if (this.timer) return this;
		this.from = from;
		this.to = to;
		this.time = Date.now();
		// Fx.Elements allows effects to be run in slave mode.
		if (!this.slave) {
			this.timer = this.step.periodic(Math.round(1000 / this.options.fps), this);
			this.fireEvent('start', [this.element]);
		}
		// Make the first step now:
		this.step();
		return this;
	},

	stop: function(end) {
		if (this.timer) {
			this.timer = this.timer.clear();
			if (!end) this.fireEvent('cancel', [this.element]).clearChain();
		}
		return this;
	}
});

//#endif // __browser_effects_Fx__