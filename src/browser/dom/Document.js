#ifndef __browser_dom_Document__
#define __browser_dom_Document__

////////////////////////////////////////////////////////////////////////////////
// Document

Document = DomElement.get(document);

#ifdef DEFINE_GLOBALS

function $(selector, root) {
	return (root || Document).getElement(selector);
}

function $$(selector, root) {
	return (root || Document).getElements(selector);
}

#endif // DEFINE_GLOBALS

#endif // __browser_dom_Document__