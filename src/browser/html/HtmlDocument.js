#ifndef __browser_html_HtmlDocument__
#define __browser_html_HtmlDocument__

#include "HtmlElement.js"

////////////////////////////////////////////////////////////////////////////////
// HtmlDocument

HtmlDocument = DomDocument.extend({
	// Use HtmlElements collection instead of DomElements for HtmlDocuments
	_collection: HtmlElements
});

#endif // __browser_html_HtmlDocument__