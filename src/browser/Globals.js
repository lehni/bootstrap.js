#ifndef __browser_Globals__
#define __browser_Globals__

////////////////////////////////////////////////////////////////////////////////
// Globals

#ifdef BROWSER_LEGACY
if (!this.encodeURIComponent) {
	encodeURIComponent = escape;
	decodeURIComponent = unescape;
}
#endif // BROWSER_LEGACY

// TODO: rename?
Document = DomElement.get(document);
Window = DomElement.get(window);

// Garbage collection
Window.addEvent('unload', DomElement.dispose);

#ifdef DEFINE_GLOBALS

function $(selector, root) {
	return (DomElement.get(root) || Document).getElement(selector);
}

function $$(selector, root) {
	return (DomElement.get(root) || Document).getElements(selector);
}

#endif // DEFINE_GLOBALS

#endif // __browser_Globals__