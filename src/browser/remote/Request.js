#ifndef __browser_remote_Request__
#define __browser_remote_Request__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif // HIDDEN

#include "../Callback.js"

////////////////////////////////////////////////////////////////////////////////
// Request

// options:
//   data
//   headers
//   method
//   async
//	 link
//   urlEncoded
//   encoding
//   evalScripts
//   evalResponse
//   emulation
//   json
//   secure
//   html
//   update
//   filter

Request = Base.extend(Chain, Callback, new function() {
	var unique = 0;

	function createRequest(that) {
		if (!that.transport)
			that.transport = window.XMLHttpRequest && new XMLHttpRequest()
				|| Browser.IE && new ActiveXObject('Microsoft.XMLHTTP');
	}

	function createFrame(that, form) {
		var id = 'request_' + unique++, onLoad = that.onFrameLoad.bind(that);
		// IE Fix: Setting load event on iframes does not work, use onreadystatechange
		var div = Document.getElement('body').injectBottom('div', {
				styles: {
					position: 'absolute', top: '0', marginLeft: '-10000px'
				}
			}, [
				'iframe', {
					name: id, id: id, events: { load: onLoad },
					onreadystatechange: onLoad
				}
			]
		);

		that.frame = {
			id: id, div: div, form: form,
			iframe: window.frames[id] || document.getElementById(id),
			element: Document.getElement(id)
		};
		// Opera fix: force the iframe to be valid
		div.offsetWidth;
	}

#ifdef BROWSER_LEGACY
	function checkFrame() {
		var frame = this.frame.iframe, loc = frame.location;
		if (loc && (!loc.href || loc.href.indexOf(this.url) != -1) && frame.document.readyState == 'complete') {
			this.timer.clear();
			this.onFrameLoad();
		}
	}
#endif // BROWSER_LEGACY

	return {
		options: {
			method: 'post',
			async: true,
			urlEncoded: true,
			encoding: 'utf-8',
			emulation: true,
			headers: {},
			secure: false
		},

		initialize: function(/* url: 'string', options: 'object', handler: 'function' */) {
			var params = Array.associate(arguments, { url: 'string', options: 'object', handler: 'function' });
			this.setOptions(params.options);
			this.url = params.url || this.options.url;
			// If a handler is passed, it is used to recieve both success and
			// failure events. Only the success event will recieve a result
			// argument though.
			if (params.handler)
				this.addEvents({ success: params.handler, failure: params.handler });
			this.headers = new Hash({
				'X-Requested-With': 'XMLHttpRequest',
				'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
			});
			if (this.options.json) {
				this.setHeader('Accept', 'application/json');
				this.setHeader('X-Request', 'JSON');
			}
			if (this.options.urlEncoded && this.options.method == 'post') {
				this.setHeader('Content-Type', 'application/x-www-form-urlencoded' +
					(this.options.encoding ? '; charset=' + this.options.encoding : ''));
			}
			// Always set html to true if updating elements
			if (this.options.update)
				this.options.html = true;
			this.headers.merge(this.options.headers);
		},

		onStateChange: function() {
			if (this.transport.readyState == 4 && this.running) {
				this.running = false;
				this.status = 0;
				try {
					this.status = this.transport.status;
					delete this.transport.onreadystatechange;
				} catch (e) {}
				if (!this.status || this.status >= 200 && this.status < 300) {
					this.success(this.transport.responseText, this.transport.responseXML);
				} else {
					this.fireEvent('complete').fireEvent('failure');
				}
			}
		},

		onFrameLoad: function() {
			var frame = this.frame && this.frame.iframe;
			if (frame && frame.location != 'about:blank' && this.running) {
				this.running = false;
				var doc = (frame.contentDocument || frame.contentWindow || frame).document;
				var text = doc && doc.body && (doc.body.textContent || doc.body.innerText || doc.body.innerHTML) || '';
				// First tag in IE ends up in <head>, safe it
				var head = Browser.IE && doc.getElementsByTagName('head')[0];
				text = (head && head.innerHTML || '') + text;
				// Remove div
				var div = this.frame.div;
				div.remove();
				this.success(text);
				if (Browser.GECKO) {
					// Gecko needs the iframe to stay around for a little while,
					// otherwise it appears to load endlessly. Insert it back in
					// and use delay to remove it again. This even works if
					// success above changes the whole html and would remove the
					// iframe, as it can happen during editing. Since we remove
					// it before already, it is untouched by this.
					div.insertBottom(Document.getElement('body'));
					div.remove.delay(1, div);
				}
				this.frame = null;
			}
		},

		success: function(text, xml) {
			var args;
			if (this.options.html) {
				var match = text.match(/<body[^>]*>([\u0000-\uffff]*?)<\/body>/i);
				var stripped = this.stripScripts(match ? match[1] : text);
				/*
				var html = stripped.html, javascript = stripped.scripts;
				var node = new Element('div', { html: html });
				var elements = node.getElements();
				var children = Array.create(node.childNodes).filter(function(el) {
					return Base.type(el) != 'whitespace';
				});
				if (this.options.update)
					DomElement.get(this.options.update).removeChildren().appendChildren(children);
				if (this.options.evalScripts)
					this.executeScript(stripped.scripts);
				args = [ children, elements, html, stripped.scripts ];
				*/
				if (this.options.update)
					DomElement.get(this.options.update).setHtml(stripped.html);
				if (this.options.evalScripts)
					this.executeScript(stripped.javascript);
				args = [ stripped.html, text ];
			} else if (this.options.json) {
				args = [ Json.decode(text, this.options.secure), text ];
			} else {
				args = [ this.processScripts(text), xml ]
			}
			this.fireEvent('complete', args)
				.fireEvent('success', args)
				.callChain();
		},

		stripScripts: function(html) {
			var script = '';
			html = html.replace(/<script[^>]*>([\u0000-\uffff]*?)<\/script>/gi, function() {
				script += arguments[1] + '\n';
				return '';
			});
			return { html: html, javascript: script };
		},

		processScripts: function(text) {
			if (this.options.evalResponse || (/(ecma|java)script/).test(this.getHeader('Content-type'))) {
				this.executeScript(text);
				return text;
			} else {
				// Strip scripts from text and execute bellow
				var stripped = this.stripScripts(text);
				if (this.options.evalScripts)
					this.executeScript(stripped.javascript);
				return stripped.html;
			}
		},

		executeScript: function(script) {
			if (window.execScript) {
				window.execScript(script);
			} else {
				Document.getElement('head').injectBottom('script', {
					type: 'text/javascript', text: script
				}).remove();
			}
		},

		setHeader: function(name, value) {
			this.headers[name] = value;
			return this;
		},

		getHeader: function(name) {
			try {
				if (this.transport)
					return this.transport.getResponseHeader(name);
			} catch (e) {}
			return null;
		},

		send: function(params) {
			var opts = this.options;
			switch (opts.link) {
				case 'cancel':
					this.cancel();
					break;
				case 'chain':
					this.chain(this.send.bind(this, arguments));
					return this;
			}
			if (this.running)
				return this;
			if (!params) params = {};
			var data = params.data || opts.data || '';
			var url = params.url || opts.url;
			var method = params.method || opts.method;
			switch (Base.type(data)) {
				case 'element':
					var el = DomElement.get(data);
					// No need to post using forms if there are no files
					if (el.getTag() != 'form' || !el.hasElement('input[type=file]'))
						data = el.toQueryString();
					break;
				case 'object':
					data = Base.toQueryString(data);
					break;
				default:
					data = data.toString();
			}
			this.running = true;
			if (opts.emulation && /^(put|delete)$/.test(method)) {
				if (typeof data == 'string') data += '&_method=' + method;
				else data.setValue('_method', method); // form
				method = 'post';
			}
			if (Base.type(data) == 'element') { // A form: Use iframe
		 		createFrame(this, DomElement.get(data));
			} else {
				createRequest(this);
				if (!this.transport) {
					createFrame(this);
					// No support for POST when using iframes. We could fake
					// it through a hidden form that's produced on the fly,
					// parse data and url for query values, but that feels
					// like too much code.
					method = 'get';
#ifdef BROWSER_LEGACY
					if (!url.contains('?')) url += '?'; // for MACIE to load .js
#endif // !BROWSER_LEGACY
				}
				if (data && method == 'get') {
					url = url + (url.contains('?') ? '&' : '?') + data;
					data = null;
				}
			}
			// Check frame first, as this is never reused.
			if (this.frame) {
#ifdef BROWSER_LEGACY
				if (Browser.IE5)
					this.timer = checkFrame.periodic(50, this);
#endif // !BROWSER_LEGACY
				if (this.frame.form)
					this.frame.form.set({
						target: this.frame.id, action: url, method: method,
						enctype: /* TODO: opts.urlEncoded || */ method == 'get'
							? 'application/x-www-form-urlencoded'
							: 'multipart/form-data',
						'accept-charset': opts.encoding || ''
					}).submit();
				else
					this.frame.element.setProperty('src', url);
			} else if (this.transport) {
				try {
					this.transport.open(method.toUpperCase(), url, opts.async);
					this.transport.onreadystatechange = this.onStateChange.bind(this);
					if (method == 'post' && this.transport.overrideMimeType)
						this.setHeader('Connection', 'close');
					new Hash(this.headers, opts.headers).each(function(header, name) {
						try{
							this.transport.setRequestHeader(name, header);
						} catch (e) {
							this.fireEvent('exception', [e, name, header]);
						}
					}, this);
					this.fireEvent('request');
					this.transport.send(data);
					if (!opts.async)
						this.onStateChange();
				} catch (e) {
					this.fireEvent('failure', [e]);
				}
			}
			return this;
		},

		cancel: function() {
			if (this.running) {
				this.running = false;
				if (this.transport) {
					this.transport.abort();
					this.transport.onreadystatechange = null;
					this.transport = null;
				} else if (this.frame) {
					this.frame.div.remove();
					this.frame = null;
				}
				this.fireEvent('cancel');
			}
			return this;
		}
	};
});

Form.inject({
	send: function(url) {
		if (!this.sender)
			this.sender = new Request({ link: 'cancel' });
		this.sender.send({
			url: url || this.getProperty('action'),
			data: this, method: this.getProperty('method') || 'post'
		});
	}
});

HtmlElement.inject({
	load: function() {
		if (!this.loader)
			this.loader = new Request({ link: 'cancel', update: this, method: 'get' });
		this.loader.send(Array.associate(arguments, { data: 'object', url: 'string' }));
		return this;
	}
});

#endif // __browser_remote_Request__