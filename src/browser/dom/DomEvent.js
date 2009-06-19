#ifndef __browser_dom_DomEvent__
#define __browser_dom_DomEvent__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif // HIDDEN

#include "DomElement.js"

////////////////////////////////////////////////////////////////////////////////
// DomEvent

// Name it DomEvent instead of Event, as Event is a native prototype.
DomEvent = Base.extend(new function() {
	// MACIE does not accept numbers for keys, so use strings:
	var keys = {
		 '8': 'backspace',
		'13': 'enter',
		'27': 'esc',
		'32': 'space',
		'37': 'left',
		'38': 'up',
		'39': 'right',
		'40': 'down',
		'46': 'delete'
	};

	function hover(name, type) {
		return {
			type: type,
			listener: function(event) {
				if (event.relatedTarget != this && !this.hasChild(event.relatedTarget))
					this.fireEvent(name, [event]);
			}
		}
	}

	return {
		initialize: function(event) {
			this.event = event = event || window.event;
			this.type = event.type;
			this.target = DomElement.wrap(event.target || event.srcElement);
			if (this.target.nodeType == 3)
				this.target = this.target.getParent(); // Safari
			this.shift = event.shiftKey;
			this.control = event.ctrlKey;
			this.alt = event.altKey;
			this.meta = event.metaKey;
			if (/^(mousewheel|DOMMouseScroll)$/.test(this.type)) {
				this.wheel = event.wheelDelta ?
					event.wheelDelta / (window.opera ? -120 : 120) : 
					- (event.detail || 0) / 3;
			} else if (/^key/.test(this.type)) {
				this.code = event.which || event.keyCode;
				this.key = keys[this.code] || String.fromCharCode(this.code).toLowerCase();
			} else if (/^mouse|^click$/.test(this.type)) {
				this.page = {
					x: event.pageX || event.clientX + document.documentElement.scrollLeft,
					y: event.pageY || event.clientY + document.documentElement.scrollTop
				};
				this.client = {
					x: event.pageX ? event.pageX - window.pageXOffset : event.clientX,
					y: event.pageY ? event.pageY - window.pageYOffset : event.clientY
				};
				// TODO: Calculate only if Dimension.js is defined! Add conditional macro?
				var offset = this.target.getOffset();
				this.offset = {
					x: this.page.x - offset.x,
					y: this.page.y - offset.y
				}
				this.rightClick = event.which == 3 || event.button == 2;
				if (/^mouse(over|out)$/.test(this.type))
					this.relatedTarget = DomElement.wrap(event.relatedTarget ||
						this.type == 'mouseout' ? event.toElement : event.fromElement);
			}
		},

		stop: function() {
			this.stopPropagation();
			this.preventDefault();
			return this;
		},

		stopPropagation: function() {
			if (this.event.stopPropagation) this.event.stopPropagation();
			else this.event.cancelBubble = true;
			// Needed for dragging
			this.stopped = true;
			return this;
		},

		preventDefault: function() {
			if (this.event.preventDefault) this.event.preventDefault();
			else this.event.returnValue = false;
			return this;
		},

		statics: {
			events: new Hash({
				mouseenter: hover('mouseenter', 'mouseover'),

				mouseleave: hover('mouseleave', 'mouseout'),

				mousewheel: { type: Browser.GECKO ? 'DOMMouseScroll' : 'mousewheel' },

				domready: function(func) {
					if (Browser.loaded) func.call(this);
					else if (!this.domReady) {
						// Only install it once, since fireEvent calls all the
						// handlers.
						this.domReady = true;
						var domReady = function() {
							if (!Browser.loaded) {
								Browser.loaded = true;
								this.fireEvent('domready');
							}
						}.bind(this);
						var doc = this.getDocument();
						if (Browser.WEBKIT) {
							(function() {
								if (/^(loaded|complete)$/.test(doc.$.readyState)) domReady();
								else arguments.callee.delay(50);
							})();
						} else if (Browser.IE) {
							// From: http://www.hedgerwow.com/360/dhtml/ie-dom-ondocumentready.html
							var temp = doc.createElement('div');
							(function() {
								try {
									temp.$.doScroll('left');
									temp = null;
									domReady();
								} catch (e) {
									arguments.callee.delay(50);
								}
							})();
						} else {
							this.getWindow().addEvent('load', domReady);
							doc.addEvent('DOMContentLoaded', domReady);
						}
					}
				}
			}),

			add: function(events) {
				this.events.merge(events);
			}
		}
	};
});

DomElement.inject(new function() {
	// Function that fires / triggers an event. The difference is taht
	// to trigger fake events, one need to call the 'bound' object, whereas
	// to fire the response, one calls 'func'. Bootstrap supports calling both
	// and callEvent produces the closure for each case.
	// In most cases, this calls the same function, but e.g. to initiate
	// a dragstart, we need to trigger it.
	function callEvent(fire) {
		return function(type, args, delay) {
			var entries = (this.events || {})[type];
			if (entries) {
				// Make sure we pass already wrapped events through
				var event = args && args[0];
				if (event)
					args[0] = event.event ? event : new DomEvent(event);
				entries.each(function(entry) {
					entry[fire ? 'func' : 'bound'].delay(delay, this, args);
				}, this);
			}
			// Return true if event was fired, false otherwise
			return !!entries;
		}
	}

	return {
		addEvent: function(type, func) {
			this.events = this.events || {};
			var entries = this.events[type] = this.events[type] || [];
			if (func && !entries.find(function(entry) { return entry.func == func })) {
				// See if we have a pseudo event here.
				var listener = func, name = type, pseudo = DomEvent.events[type];
				if (pseudo) {
					if (typeof pseudo == 'function') pseudo = pseudo.call(this, func);
					listener = pseudo && pseudo.listener || listener;
					name = pseudo && pseudo.type;
				}
				// Check if the function takes a parameter. If so, it must
				// want an event. Wrap it so it recieves a wrapped event, and
				// bind it to that at the same time, as on PC IE, event listeners
				// are not called bound to their objects.
				var that = this, bound = listener.getParameters().length == 0
					? listener.bind(this)
					: function(event) { 
						event = event.event ? event : new DomEvent(event);
						if (listener.call(that, event) === false)
							event.stop();
					};
				if (name) {
					if (this.$.addEventListener) {
						this.$.addEventListener(name, bound, false);
					} else if (this.$.attachEvent) {
						this.$.attachEvent('on' + name, bound);
#ifdef BROWSER_LEGACY
					} else {
						// Simulate multiple callbacks, with support for
						// stopPropagation and preventDefault
						this.$['on' + name] = function(event) {
							entries.each(function(entry) {
								entry.bound(event);
								if (event.event.cancelBubble)
									throw Base.stop;
							});
							// Passing "this" for bind above breaks throw Base.stop
							// on MACIE.
							// The reason is maybe that this is a native element?
							return event.event.returnValue;
						};
#endif // !BROWSER_LEGACY
					}
				}
				// Func is the one to be called through fireEvent. see dragstart
				// Also store a refrence to name here, as this might have changed too.
				entries.push({ func: func, name: name, bound: bound });
			}
			return this;
		},

		removeEvent: function(type, func) {
			var entries = (this.events || {})[type], entry;
			if (func && entries) {
#ifdef BROWSER_LEGACY
				// When shutting down, added functions seem to disappear here on
				// Mac IE. Fix it the easy way.
				// TODO: Check if still needed?
				entries = this.events[type] = Array.create(entries);
#endif // !BROWSER_LEGACY
				if (entry = entries.remove(function(entry) { return entry.func == func })) {
					var name = entry.name, pseudo = DomEvent.events[type];
					if (pseudo && pseudo.remove) pseudo.remove.call(this, func);
					if (name) {
						if (this.$.removeEventListener) {
							this.$.removeEventListener(name, entry.bound, false);
						} else if (this.$.detachEvent) {
							this.$.detachEvent('on' + name, entry.bound);
#ifdef BROWSER_LEGACY
						} else if (!entries.length) {
							this.$['on' + name] = null;
#endif // !BROWSER_LEGACY
						}
					}
				}
			}
			return this;
		},

		addEvents: function(events) {
			return Base.each(events || [], function(fn, type) {
				this.addEvent(type, fn);
			}, this);
		},

		removeEvents: function(type) {
			if (this.events) {
				if (type) {
					(this.events[type] || []).each(function(fn) {
						this.removeEvent(type, fn);
					}, this);
					delete this.events[type];
				} else {
					Base.each(this.events, function(ev, type) {
						this.removeEvents(type);
					}, this);
					this.events = null;
				}
			}
			return this;
		},

		fireEvent: callEvent(true),

		triggerEvent: callEvent(false),

		finalize: function() {
			this.removeEvents();
		}
	};
});

#endif // __browser_dom_DomEvent__
