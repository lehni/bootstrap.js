//#ifndef __browser_html_Image__
//#define __browser_html_Image__

//#include "HtmlElement.js"

////////////////////////////////////////////////////////////////////////////////
// HtmlImage

HtmlImage = HtmlElement.extend({
	BEANS_TRUE
	_tag: 'img',
	_properties: ['src', 'alt', 'title']
});

//#endif // __browser_html_Image__
