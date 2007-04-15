#ifndef __browser_Event__
#define __browser_Event__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif
#include "Element.js"

////////////////////////////////////////////////////////////////////////////////
// Event

Element.eventMethods = {
	addEvent: function(type, func) {
		this.events = this.events || {};
		var fns = this.events[type] = this.events[type] || [];
		if (!fns.contains(func)) {
			fns.push(func);
			// check if the function takes a parameter. if so, it must
			// want an event. Wrap it so it recieves a wrapped event, and
			// bind it to that at the same time, as on PC IE, event listeners
			// are not called bound to their objects.
			var that = this, fn = func, hasEvent = fn.parameters().length > 0;
			if (hasEvent) fn = function(event) { // wants event param
				return func.call(that, new Event(event));
			};
			if (this.addEventListener) {
				this.addEventListener(type == 'mousewheel' && Browser.GECKO ?
					'DOMMouseScroll' : type, fn, false);
			} else if (this.attachEvent) {
				// on PC IE, the handler allways needs to be bound.
				// But if hasEvent is true, it was already wrapped above.
				if (!hasEvent) fn = func.bind(this);
				func.bound = fn;
				this.attachEvent('on' + type, fn);
#ifdef BROWSER_LEGACY
			} else {
				// Simulate multiple callbacks, with support for stopPropagation
				// and preventDefault
				this['on' + type] = function(event) {
					event = new Event(event);
					fns.each(function(fn) {
						fn.call(that, event);
						if (event.event.cancelBubble) throw $break;
					});
					// passing "this" for bind above breaks throw $break on MACIE
					// the reason is maybe that this is a native element...?
					return event.event.returnValue;
				};
#endif // !BROWSER_LEGACY
			}
		}
		return this;
	},

	addEvents: function(src) {
		return (src || []).each(function(fn, type) {
			this.addEvent(type, fn);
		}, this);
	},

	removeEvent: function(type, func) {
		var fns = (this.events || {})[type];
		if (fns) {
#ifdef BROWSER_LEGACY
			// when sutting down, added functions seem to disappear here on
			// Mac IE. Fix it the easy way.
			fns = $A(fns);
#endif // !BROWSER_LEGACY
			if (fns.remove(func)) {
				if (this.removeEventListener) {
					this.removeEventListener(type == 'mousewheel' && window.gecko ?
						'DOMMouseScroll' : type, func, false);
				} else if (this.detachEvent) {
					this.detachEvent('on' + type, func.bound);
#ifdef BROWSER_LEGACY
				} else if (!fns.length) {
					this['on' + type] = null;
#endif // !BROWSER_LEGACY
				}
			}
		}
		return this;
	},

	removeEvents: function(type) {
		if (this.events) {
			if (type) {
				(this.events[type] || []).each(function(fn) {
					this.removeEvent(type, fn);
				}, this);
				delete this.events[type];
			} else {
				this.events.each(function(ev, type) {
					this.removeEvents(type);
				}, this);
				this.events = null;
			}
		}
		return this;
	},

	fireEvent: function(type) {
		var fns = (this.events || {})[type];
		if (fns) {
			var args = $A(arguments, 1);
			fns.each(function(fn) {
				fn.apply(this, args);
			}, this);
		}
	},

	/**
	 * For Garbage Collection
	 */
	dispose: function() {
		this.removeEvents();
	}
}

window.inject(Element.eventMethods);
document.inject(Element.eventMethods);
Element.inject(Element.eventMethods);

// Opera 7 does not let us override Event. But after deleting it,
// overriding is possible
delete Event;
Event = Object.extend(function() {
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

	return {
		$constructor: function(event) {
			this.event = event = event || window.event;
			this.type = event.type;
			this.target = event.target || event.srcElement;
			if (this.target.nodeType == 3)
				this.target = this.target.parentNode; // Safari
			this.shift = event.shiftKey;
			this.control = event.ctrlKey;
			this.alt = event.altKey;
			this.meta = event.metaKey;
			if (/^(mousewheel|DOMMouseScroll)$/.test(this.type)) {
				this.wheel = event.wheelDelta ?
					event.wheelDelta / (window.opera ? -120 : 120) : 
					- (event.detail || 0) / 3;
			} else if (/key/.test(this.type)) {
				this.code = event.which || event.keyCode;
				this.key = keys[this.code] || String.fromCharCode(this.code).toLowerCase();
			} else if (/mouse/.test(this.type) || this.type == 'click') {
				this.page = {
					x: event.pageX || event.clientX + document.documentElement.scrollLeft,
					y: event.pageY || event.clientY + document.documentElement.scrollTop
				};
				this.client = {
					x: event.pageX ? event.pageX - window.pageXOffset : event.clientX,
					y: event.pageY ? event.pageY - window.pageYOffset : event.clientY
				};
				this.rightClick = event.which == 3 || event.button == 2;
				if (/^mouse(over|out)$/.test(this.type))
					this.relatedTarget = event.relatedTarget || this.type == 'mouseout' ? event.toElement : event.fromElement;
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
			return this;
	    },

		preventDefault: function() {
			if (this.event.preventDefault) this.event.preventDefault();
			else this.event.returnValue = false;
			return this;
		}
	};
});

#endif // __browser_Event__
