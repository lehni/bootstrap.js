#ifndef __browser_html_HtmlDocument__
#define __browser_html_HtmlDocument__

#include "HtmlElement.js"

////////////////////////////////////////////////////////////////////////////////
// HtmlDocument

HtmlDocument = DomDocument.extend({
	// TODO: Find out if this is needed here. Isn't it dangerous to inject
	// HtmlDocument functions into HtmlElements
	_elements: HtmlElements
});

#endif // __browser_html_HtmlDocument__