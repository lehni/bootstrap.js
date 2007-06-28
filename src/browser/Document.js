#ifndef __browser_Document__
#define __browser_Document__

////////////////////////////////////////////////////////////////////////////////
// Document

Document = DomElement.get(document);
// TODO: find a better workaround for this.
Document._elements = HtmlElements;

function $(selector, root) {
	return (root || Document).getElement(selector);
}

function $$(selector, root) {
	return (root || Document).getElements(selector);
}

#endif // __browser_Document__