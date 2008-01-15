#ifndef __browser_remote_Ajax__
#define __browser_remote_Ajax__

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
		this.addEvent('success', this.onSuccess);
		if (!/^(post|get)$/.test(this.options.method)) {
			this._method = this.options.method;
			this.options.method = 'post';
		}
		this.base(params.url, params.options, params.handler);
	},

	onSuccess: function() {
		if (this.options.update) Document.getElements(this.options.update).setHtml(this.response.text);
		if (this.options.evalScripts || this.options.evalResponse) this.evalScripts();
	},

	send: function(url, data) {
		if (data === undefined) {
			data = url || '';
			url = this.url;
		}
		data = data || this.options.data || '';
		switch (Base.type(data)) {
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
		return this.base(url, data);
	},

	evalScripts: function() {
		var script, scripts;
		if (this.options.evalResponse || (/(ecma|java)script/).test(this.getHeader('Content-Type'))) {
			scripts = this.response.text;
		} else {
			scripts = [];
			var exp = /<script[^>]*>([\u0000-\uffff]*?)<\/script>/gi;
			while ((script = exp.exec(this.response.text)))
				scripts.push(script[1]);
			scripts = scripts.join('\n');
		}
		if (scripts) window.execScript ? window.execScript(scripts) : window.setTimeout(scripts, 0);
	}
});

Base.inject({
	HIDE
	_generics: true,

	toQueryString: function() {
		return Base.each(this, function(val, key) {
			this.push(encodeURIComponent(key) + '=' + encodeURIComponent(val));
		}, []).join('&');
	}
});

HtmlElement.inject({
	toQueryString: function() {
		return Base.toQueryString(this.getValues());
	},

	send: function(options) {
		return new Ajax(this.getProperty('action'), Hash.create({ method: 'post' }, options)).send(this);
	},

	update: function(/* url: 'string', options: 'object', handler: 'function', data: 'any' */) {
		var params = Array.associate(arguments, { url: 'string', options: 'object', handler: 'function', data: 'any' });
		return new Ajax(params.url, Hash.create({ update: this }, params.options), params.handler).send(params.data);
	}
});

#endif // __browser_remote_Ajax__