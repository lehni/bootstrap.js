#ifndef __browser_Fx__
#define __browser_Fx__

/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */

#include "../Callback.js"

////////////////////////////////////////////////////////////////////////////////
// Fx

Fx = {};

Fx.Transitions = {
	linear: function(t, b, c, d) {
		return c * t / d + b;
	},

	sineInOut: function(t, b, c, d) {
		return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
	}
};

Fx.Base = Object.extend({
	options: {
		transition: Fx.Transitions.sineInOut,
		duration: 500,
		unit: 'px',
		wait: true,
		fps: 50
	},

	$constructor: function(opts) {
		this.element = this.element || null;
		this.setOptions(opts);
		if (this.options.$constructor)
			this.options.$constructor.call(this);
	},

	step: function() {
		var time = new Date().getTime();
		if (time < this.time + this.options.duration) {
			this.delta = time - this.time;
			this.update(this.get());
		} else {
			this.stop(true);
			this.update(this.to);
			this.fireEvent('onComplete', this.element, 10);
			this.callChain();
		}
	},

	set: function(to) {
		this.update(to);
		return this;
	},

	get: function() {
		return this.compute(this.from, this.to);
	},

	compute: function(from, to) {
		return this.options.transition(this.delta, from, (to - from), this.options.duration);
	},

	start: function(from, to) {
		if (!this.options.wait) this.stop();
		else if (this.timer) return this;
		this.from = from;
		this.to = to;
		this.time = new Date().getTime();
		this.timer = this.step.periodic(Math.round(1000 / this.options.fps), this);
		this.fireEvent('start', this.element);
		this.step();
		return this;
	},

	stop: function(end) {
		if (this.timer) {
			this.timer = this.timer.clear();
			if (!end) this.fireEvent('cancel', this.element);
		}
		return this;
	}
});

Fx.Base.inject(Chain);
Fx.Base.inject(Callback);

#endif // __browser_Fx__