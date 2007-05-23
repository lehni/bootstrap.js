#ifndef __browser_Drag__
#define __browser_Drag__

#include "Element.js"
#include "Event.js"

////////////////////////////////////////////////////////////////////////////////
// Drag

// Fake dragstart, drag and dragend events, all in a self contained injectd scope.

Element.Events.inject(function() {
	var object, last;

	function dragStart(event) {
		event.type = 'dragstart';
		last = event.page;
		if (this.onDragStart) this.onDragStart(event);
		// onDragStart might stop the event, check here
		if (!event.stopped) {
			event.stop();
			document.addEvent('mousemove', drag);
			document.addEvent('mouseup', dragEnd);
			object = this;
		}
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

	return {
		dragstart: {
			property: 'onDragStart',
			type: 'mousedown',
			listener: dragStart
		},
		drag: {
			property: 'onDrag'
		},
		dragend: {
			property: 'onDragEnd'
		}
	};
});

#endif // __browser_Drag__
