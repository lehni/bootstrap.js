#ifndef __lang_Ajax__
#define __lang_Ajax__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif

#include "HttpRequest.js"

////////////////////////////////////////////////////////////////////////////////
// Ajax

// options
//   data
//   update
//   evalScripts
//   evalResponse

Ajax = HttpRequest.extend({
	initialize: function(/* url: 'string', options: 'object', handler: 'function' */) {
		var params = Array.associate(arguments, { url: 'string', options: 'object', handler: 'function' });
		this.addEvent('success', this.onSuccess, true);
		if (!/^(post|get)$/.test(this.options.method)) {
			this._method = this.options.method;
			this.options.method = 'post';
		}
		this.base(params.url, params.options, params.handler);
		this.setHeader('X-Requested-With', 'XMLHttpRequest');
		this.setHeader('Accept', 'text/javascript, text/html, application/xml, text/xml, */*');
	},

	onSuccess: function() {
		if (this.options.update) Document.getElements(this.options.update).setHtml(this.response.text);
		if (this.options.evalScripts || this.options.evalResponse) this.evalScripts();
	},

	request: function(url, data) {
		if (data === undefined) {
			data = url || '';
			url = this.url;
		}
		data = data || this.options.data || '';
		switch ($typeof(data)) {
			case 'element':
				var el = DomElement.get(data);
				// No need to post using forms if there are no files
				if (el.getTag() != 'form' || !el.hasElement('input[type=file]'))
					data = el.toQueryString();
				break;
			case 'object': data = Base.toQueryString(data);
			default:
				data = data.toString();
		}
		if (this._method) {
			if (typeof data == 'string') data += '&_method=' + this._method;
			else data.setValue('_method', this._method); // form
		}
		return this.send(url, data);
	},

	evalScripts: function() {
		var script, scripts;
		if (this.options.evalResponse || (/(ecma|java)script/).test(this.getHeader('Content-Type'))) {
			scripts = this.response.text;
		} else {
			scripts = [];
			var exp = /<script[^>]*>([\s\S]*?)<\/script>/gi;
			while ((script = exp.exec(this.response.text)))
				scripts.push(script[1]);
			scripts = scripts.join('\n');
		}
		if (scripts) window.execScript ? window.execScript(scripts) : window.setTimeout(scripts, 0);
	}
});

Base.inject({
	toQueryString: function() {
		return EACH(this, function(val, key) {
			this.push(encodeURIComponent(key) + '=' + encodeURIComponent(val));
		}, []).join('&');
	}
});

HtmlElement.inject({
	toQueryString: function() {
		return Base.toQueryString(this.getValues());
	},

	send: function(options) {
		return new Ajax(this.getProperty('action'), Hash.create({ method: 'post' }, options)).request(this);
	},

	update: function(/* url: 'string', options: 'object', onComplete: 'function', data: 'any' */) {
		var params = Array.associate(arguments, { url: 'string', options: 'object', onComplete: 'function', data: 'any' });
		return new Ajax(params.url, Hash.create({ update: this }, params.options), params.onComplete).request(params.data);
	}
});

#endif // __lang_Ajax__