#ifndef __browser_effects_Fx_Scroll__
#define __browser_effects_Fx_Scroll__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif // HIDDEN

#include "Fx.js"

////////////////////////////////////////////////////////////////////////////////
// Fx.Scroll

Fx.Scroll = Fx.extend({
	options: {
		offset: { x: 0, y: 0 },
		wheelStops: true
	},

	initialize: function(element, options) {
		this.base(element, options);
		if (this.options.wheelStops) {
			var stop = this.stop.bind(this), stopper = this.element;
			this.addEvent('start', function() {
				stopper.addEvent('mousewheel', stop);
			}, true);
			this.addEvent('complete', function() {
				stopper.removeEvent('mousewheel', stop);
			}, true);
		}
	},

	update: function(x, y) {
		var now = Array.flatten(arguments);
		this.element.setScrollOffset(now[0], now[1]);
	},

	get: function() {
		var now = [];
		for (var i = 0; i < 2; i++)
			now.push(this.compute(this.from[i], this.to[i]));
		return now;
	},

	start: function(x, y) {
		var offsetSize = this.element.getSize(),
			scrollSize = this.element.getScrollSize(),
			scroll = this.element.getScrollOffset(),
			values = { x: x, y: y };
		var lookup = { x: 'width', y: 'height' };
		for (var i in values) {
			var s = lookup[i];
			var max = scrollSize[s] - offsetSize[s];
			if (Base.check(values[i]))
				values[i] = Base.type(values[i]) == 'number'
					? values[i].limit(0, max) : max;
			else values[i] = scroll[i];
			values[i] += this.options.offset[i];
		}
		return this.base([scroll.x, scroll.y], [values.x, values.y]);
	},

	toTop: function(){
		return this.start(false, 0);
	},

	toLeft: function(){
		return this.start(0, false);
	},

	toRight: function(){
		return this.start('right', false);
	},

	toBottom: function(){
		return this.start(false, 'bottom');
	},

	toElement: function(el) {
		var offset = DomElement.get(el).getOffset();
		return this.start(offset.x, offset.y);
	}
});

Fx.SmoothScroll = Fx.Scroll.extend({
	initialize: function(options, context) {
		context = DomElement.get(context || document);
		var doc = context.getDocument(), win = context.getWindow();
		this.base(doc, options);
		var links = this.options.links ? $$(this.options.links) : $$('a', context);
		var loc = win.location.href.match(/^[^#]*/)[0] + '#';
		links.each(function(link) {
			if (link.$.href.indexOf(loc) != 0) return;
			var hash = link.$.href.substring(loc.length);
			var anchor = hash && DomElement.get(hash, context);
			if (anchor) {
				link.addEvent('click', function(event) {
					this.toElement(anchor);
					var props = anchor.getProperties('name', 'id');
					anchor.removeProperties('name', 'id');
					win.location.hash = hash;
					anchor.setProperties(props);
					event.stop();
				}.bind(this));
			}
		}, this);
	}
});

#endif // __browser_effects_Fx_Scroll__