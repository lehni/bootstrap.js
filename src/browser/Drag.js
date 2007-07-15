#ifndef __browser_Drag__
#define __browser_Drag__

#include "DomEvent.js"
#include "Document.js"

////////////////////////////////////////////////////////////////////////////////
// Drag

// Fake dragstart, drag and dragend events, all in a self contained inject scope.

DomEvent.add(new function() {
	var object, last;

	function dragStart(event) {
		if (object != this) {
			event.type = 'dragstart';
			last = event.page;
			this.fireEvent('dragstart', event);
			// dragstart might stop the event, check here
			if (!event.stopped) {
				event.stop();
				Document.addEvent('mousemove', drag);
				Document.addEvent('mouseup', dragEnd);
				object = this;
			}
		}
	}

	function drag(event) {
		event.type = 'drag';
		event.delta = {
			x: event.page.x - last.x,
			y: event.page.y - last.y
		}
		last = event.page;
		object.fireEvent('drag', event);
		event.preventDefault();
	}

	function dragEnd(event) {
		if (object) {
			event.type = 'dragend';
			object.fireEvent('dragend', event);
			event.preventDefault();
			Document.removeEvent('mousemove', drag);
			Document.removeEvent('mouseup', dragEnd);
			object = null;
		}
	}

	return {
		dragstart: {
			type: 'mousedown',
			listener: dragStart
		},

		drag: {
			type: 'mousedown',
			listener: dragStart
		},

		dragend: {}
	};
});

#endif // __browser_Drag__
