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
//   type (json, html, xml)
//   secure
//   update
//   filter

Request = Base.extend(Chain, Callback, new function() {
	var unique = 0;

	function createRequest(that) {
		if (!that.transport)
			that.transport = window.XMLHttpRequest && new XMLHttpRequest()
				|| Browser.TRIDENT && new ActiveXObject('Microsoft.XMLHTTP');
	}

	function createFrame(that) {
		var id = 'request_' + unique++, load = that.onFrameLoad.bind(that);
		// IE Fix: Setting load event on iframes does not work, use onreadystatechange
		var div = DomElement.get('body').injectBottom('div', {
				styles: {
					position: 'absolute', width: 0, height: 0, top: 0, marginLeft: '-10000px'
				}
			}, [
				'iframe', {
					name: id, id: id, events: { load: load, readystatechange: load }
				}
			]
		);
		that.frame = {
			id: id, div: div,
			iframe: window.frames[id] || document.getElementById(id),
			element: DomElement.get(id)
		};
		// Opera fix: force the iframe to be valid
		div.offsetWidth;
	}

	return {
		options: {
			headers: {
				'X-Requested-With': 'XMLHttpRequest',
				'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
			},
			method: 'post',
			async: true,
			urlEncoded: true,
			encoding: 'utf-8',
			emulation: true,
			secure: false
		},

		initialize: function(/* url: 'string', options: 'object', handler: 'function' */) {
			var params = Array.associate(arguments, { url: 'string', options: 'object', handler: 'function' });
			this.setOptions(params.options);
			// If a handler is passed, it is used to recieve both success and
			// failure events. Only the success event will recieve a result
			// argument though.
			if (params.handler)
				this.addEvent('complete', params.handler);
			// Always set type to html if updating elements
			if (this.options.update)
				this.options.type = 'html';
			this.headers = new Hash(this.options.headers);
			if (this.options.type == 'json') {
				this.setHeader('Accept', 'application/json');
				this.setHeader('X-Request', 'JSON');
			}
			if (this.options.urlEncoded && /^(post|put)$/.test(this.options.method)) {
				this.setHeader('Content-Type', 'application/x-www-form-urlencoded' +
					(this.options.encoding ? '; charset=' + this.options.encoding : ''));
			}
			this.headers.append(this.options.headers);
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
			var frame = this.frame && this.frame.iframe, loc = frame && frame.location,
				doc = frame && (frame.contentDocument || frame.contentWindow || frame).document;
			if (this.running && frame && loc && (!loc.href || loc.href.indexOf(this.url) != -1)
				&& /^(loaded|complete|undefined)$/.test(doc.readyState)) {
				this.running = false;
				// Try fetching value from the first tetarea in the document first,
				// since that's the convention to send data with iframes now, just
				// like in dojo.
				var html = this.options.type == 'html', area = !html
					&& doc.getElementsByTagName('textarea')[0];
				var text = doc && (area && area.value || doc.body
					&& (html && doc.body.innerHTML || doc.body.textContent
					|| doc.body.innerText)) || '';
				// Clear src
				this.frame.element.setProperty('src', '');
				// TODO: Add support for xml?
				this.success(text);
				// We need the iframe to stay around for a little while,
				// otherwise it appears to load endlessly. Insert it back in
				// and use delay to remove it again. This even works if
				// success above changes the whole html and would remove the
				// iframe, as it can happen during editing. Since we remove
				// it before already, it is untouched by this.
				if (!this.options.link) {
					var div = this.frame.div;
					div.insertBottom(DomElement.get('body'));
					div.remove.delay(5000, div);
					this.frame = null;
				}
			}
		},

		success: function(text, xml) {
			var args;
			switch (this.options.type) {
			case 'html':
				var match = text.match(/<body[^>]*>([\u0000-\uffff]*?)<\/body>/i);
				var stripped = this.stripScripts(match ? match[1] : text);
				if (this.options.update)
					DomElement.get(this.options.update).setHtml(stripped.html);
				if (this.options.evalScripts)
					this.executeScript(stripped.script);
				args = [ stripped.html, text ];
				break;
			case 'json':
				args = [ Json.decode(text, this.options.secure), text ];
				break;
			default: // xml?
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
			return { html: html, script: script };
		},

		processScripts: function(text) {
			if (this.options.evalResponse || (/(ecma|java)script/).test(this.getHeader('Content-type'))) {
				this.executeScript(text);
				return text;
			} else {
				// Strip scripts from text and execute bellow
				var stripped = this.stripScripts(text);
				if (this.options.evalScripts)
					this.executeScript(stripped.script);
				return stripped.html;
			}
		},

		executeScript: function(script) {
			if (window.execScript) {
				window.execScript(script);
			} else {
				DomElement.get('head').injectBottom('script', {
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

		send: function() {
			var params = Array.associate(arguments, { url: 'string', options: 'object', handler: 'function' });
			var opts = params.options ? Hash.merge(params.options, this.options) : this.options;
			if (params.handler)
				this.addEvent('complete', function() {
					params.handler.apply(this, arguments);
					this.removeEvent('complete', arguments.callee);
				});
			if (this.running) {
				switch (opts.link) {
					case 'cancel':
						this.cancel();
						break;
					case 'chain':
						this.chain(this.send.wrap(this, arguments));
					default:
						return this;
				}
			}
			var data = opts.data || '';
			var url = params.url || opts.url;
			switch (Base.type(data)) {
				case 'element':
				 	data = DomNode.wrap(data);
					// No need to post using forms if there are no files
					if (data.getTag() != 'form' || !data.hasElement('input[type=file]'))
						data = data.toQueryString();
					break;
				case 'object':
					data = Base.toQueryString(data);
					break;
				default:
					data = data.toString();
			}
			var string = typeof data == 'string', method = opts.method;
			if (opts.emulation && /^(put|delete)$/.test(method)) {
				if (string) data += '&_method=' + method;
				else data.setValue('_method', method);
				method = 'post';
			}
			if (string && !this.options.iframe) {
				createRequest(this);
				if (!this.transport) {
					if (!this.frame)
						createFrame(this);
					// No support for POST when using iframes. We could fake
					// it through a hidden form that's produced on the fly,
					// parse data and url for query values, but that's going a bit
					// far for legacy support.
					method = 'get';
				}
			} else if (!this.frame) {
 				createFrame(this);
			}
			if (string && data && method == 'get') {
				url += (url.contains('?') ? '&' : '?') + data;
				data = null;
			}
			this.running = true;
			this.url = url;
			// Check frame first, as this is never reused.
			if (this.frame) {
				// Are we sending the request by submitting a form or simply
				// setting the src?
				var form = !string && data;
				if (form) {
					form.set({
						target: this.frame.id, action: url, method: method,
						enctype: /* TODO: opts.urlEncoded || */ method == 'get'
							? 'application/x-www-form-urlencoded'
							: 'multipart/form-data',
						'accept-charset': opts.encoding || ''
					}).submit();
				} else {
					this.frame.element.setProperty('src', url);
				}
			} else if (this.transport) {
				try {
					this.transport.open(method.toUpperCase(), url, opts.async);
					this.transport.onreadystatechange = this.onStateChange.bind(this);
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

HtmlForm.inject({
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