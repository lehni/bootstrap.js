#ifndef __browser_Globals__
#define __browser_Globals__

////////////////////////////////////////////////////////////////////////////////
// Globals

// Sort out garbage collection at the same time
DEFINE_BROWSER_GLOBAL(document, DomNode.wrap(document));
DEFINE_BROWSER_GLOBAL(window, DomNode.wrap(window).addEvent('unload', DomNode.dispose));

#endif // __browser_Globals__