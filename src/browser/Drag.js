#ifndef __browser_Drag__
#define __browser_Drag__

#include "Element.js"
#include "Event.js"

////////////////////////////////////////////////////////////////////////////////
// Drag

// Fake dragstart, drag and dragend events, all in a self contained injectd scope.

Element.inject(function() {
	var object, last;

	function dragStart(event) {
		event.type = 'dragstart';
		if (this.onDragStart) this.onDragStart(event);
		last = event.page;
		event.stop();
		document.addEvent('mousemove', drag);
		document.addEvent('mouseup', dragEnd);
		object = this;
	}

	function drag(event) {
		event.type = 'drag';
		event.delta = {
			x: event.page.x - last.x,
			y: event.page.y - last.y
		}
		last = event.page;
		if (object.onDrag) object.onDrag(event);
		event.preventDefault();
	}

	function dragEnd(event) {
		event.type = 'dragend';
		if (object.onDragEnd) object.onDragEnd(event);
		event.preventDefault();
		document.removeEvent('mousemove', drag);
		document.removeEvent('mouseup', dragEnd);
		object = null;
	}

	// Due to the call to $super, this function can be used for both
	// addEvent and removeEvent. The only thing different are the fake
	// handlers when removing, so there's a third argument for that.
	function handleEvent(that, type, func, fake) {
		switch (type) {
		case 'drag':
		case 'dragstart':
			if (type == 'drag') that.onDrag = fake;
			else that.onDragStart = fake;
			that.$super('mousedown', dragStart);
			break;
		case 'dragend': that.onDragEnd = fake; break;
		default:
			that.$super(type, func);
		}
		return that;
	}

	return {
		addEvent: function(type, func) {
			// We need to use this.$super somewhere, otherwise it wont bet set for us!
			return handleEvent(this, type, func, func, this.$super);
		},

		removeEvent: function(type, func) {
			return handleEvent(this, type, func, null, this.$super);
		}
	};
});

#endif // __browser_Drag__
