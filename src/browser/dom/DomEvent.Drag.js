//#ifndef __browser_dom_DomEvent_Drag__
//#define __browser_dom_DomEvent_Drag__

//#include "DomEvent.js"

////////////////////////////////////////////////////////////////////////////////
// Drag

// Fake dragstart, drag and dragend events, all in a self contained inject scope.

DomEvent.add(new function() {
	var object, last;

	function dragStart(event) {
		if (object != this) {
			event.type = 'dragstart';
			last = event.page;
			this.fireEvent('dragstart', [event]);
			// dragstart might stop the event, check here
			if (!event.stopped) {
				event.stop();
				var doc = this.getDocument();
				doc.addEvent('mousemove', drag);
				doc.addEvent('mouseup', dragEnd);
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
		object.fireEvent('drag', [event]);
		event.preventDefault();
	}

	function dragEnd(event) {
		if (object) {
			event.type = 'dragend';
			object.fireEvent('dragend', [event]);
			event.preventDefault();
			var doc = object.getDocument();
			doc.removeEvent('mousemove', drag);
			doc.removeEvent('mouseup', dragEnd);
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

//#endif // __browser_dom_DomEvent_Drag__
