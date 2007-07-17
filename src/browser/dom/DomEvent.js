#ifndef __browser_dom_DomEvent__
#define __browser_dom_DomEvent__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif

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
					this.fireEvent(name, event);
			}
		}
	}

	return {
		initialize: function(event) {
			this.event = event = event || window.event;
			this.type = event.type;
			this.target = DomElement.get(event.target || event.srcElement);
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
				// TODO: Calculate only if Dimension.js is defined! add conditional macro?
				var offset = this.target.getOffset();
				this.offset = {
					x: this.page.x - offset.x,
					y: this.page.y - offset.y
				}
				this.rightClick = event.which == 3 || event.button == 2;
				if (/^mouse(over|out)$/.test(this.type))
					this.relatedTarget = DomElement.get(event.relatedTarget ||
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
				domready: function(func) { // only used by Window.
					if (window.loaded) func.call(this);
					else {
						var domReady = function() {
							if (this.loaded) return;
							this.loaded = true;
							if (this.timer) this.timer = this.timer.clear();
							this.fireEvent('domready');
						}.bind(this);
						if (document.readyState && (Browser.WEBKIT || Browser.MACIE)) { // Safari and Konqueror
							this.timer = (function() {
								if (/^(loaded|complete)$/.test(document.readyState)) domReady();
							}).periodic(50);
						} else if (document.readyState && Browser.IE) { // IE
							document.write('<script id=ie_ready defer src="'
								+ (window.location.protocol == 'https:' ? '://0' : 'javascript:void(0)')
								+ '"><\/script>');
							document.getElementById('ie_ready').onreadystatechange = function() {
								if (window.readyState == 'complete') domReady();
							};
						} else { // Others
							Window.addEvent('load', domReady);
							Document.addEvent('DOMContentLoaded', domReady);
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

DomElement.inject({
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
			var that = this, bound = (listener.parameters().length == 0)
				? listener.bind(this)
				: function(event) { 
					event = new DomEvent(event);
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
							if (event.event.cancelBubble) throw $break;
						});
						// passing "this" for bind above breaks throw $break
						// on MACIE.
						// The reason is maybe that this is a native element?
						return event.event.returnValue;
					};
#endif // !BROWSER_LEGACY
				}
			}
			// func is the one to be called through fireEvent. see dragstart
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
		return EACH((events || []), function(fn, type) {
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
				EACH(this.events, function(ev, type) {
					this.removeEvents(type);
				}, this);
				this.events = null;
			}
		}
		return this;
	},

	fireEvent: function(type, event) {
		var entries = (this.events || {})[type];
		if (entries) {
			// Make sure we pass already wrapped events through
			if (event) event = event.event ? event : new DomEvent(event);
			entries.each(function(entry) {
				entry.func.call(this, event);
			}, this);
		}
	},

	dispose: function() {
		this.removeEvents();
	}
});

#endif // __browser_dom_DomEvent__
