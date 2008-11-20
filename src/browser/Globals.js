#ifndef __browser_Globals__
#define __browser_Globals__

////////////////////////////////////////////////////////////////////////////////
// Globals

// Sort out garbage collection at the same time
DEFINE_BROWSER_GLOBAL(document, DomElement.wrap(document));
DEFINE_BROWSER_GLOBAL(window, DomElement.wrap(window).addEvent('unload', DomElement.dispose));

#endif // __browser_Globals__