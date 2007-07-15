#ifndef __lang_HttpRequest__
#define __lang_HttpRequest__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif

#include "../Callback.js"

////////////////////////////////////////////////////////////////////////////////
// HttpRequest

// options:
//   data
//   headers
//   autoCancel
//   method
//   async
//   urlEncoded
//   encoding

HttpRequest = Base.extend(new function() {
	var unique = 0;

	function createRequest(that) {
		if (!that.transport)
			that.transport = window.XMLHttpRequest && new XMLHttpRequest()
				|| Browser.IE && new ActiveXObject('Microsoft.XMLHTTP');
	}

	function createFrame(that, form) {
		var id = 'request_' + unique++, onLoad = that.onFrameLoad.bind(that);
		// IE Fix: Setting load event on iframes does not work, use onreadystatechange
		var div = Document.getElement('body').createInside(
			'div', { styles: { position: 'absolute', top: '0', marginLeft: '-10000px' }}, [
				'iframe', { name: id, id: id, events: { load: onLoad }, onreadystatechange: onLoad }
			]
		);
		that.frame = {
			id: id, div: div, form: form,
			iframe: window.frames[id] || document.getElementById(id),
			element: Document.getElement(id)
		};
		// Opera fix: force the frame to render:
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
			encoding: 'utf-8'
		},

		initialize: function(/* url: 'string', options: 'object', handler: 'function' */) {
			var params = Array.associate(arguments, { url: 'string', options: 'object', handler: 'function' });
			this.url = params.url;
			this.setOptions(params.options);
			if (params.handler)
				this.addEvents({ success: params.handler, failure: params.handler });
			this.options.isSuccess = this.options.isSuccess || this.isSuccess;
			this.headers = new Hash();
			if (this.options.urlEncoded && this.options.method == 'post') {
				this.encoding = this.options.encoding ? '; charset=' + this.options.encoding : '';
				this.setHeader('Content-Type', 'application/x-www-form-urlencoded' + this.encoding);
			}
			if (this.options.initialize)
				this.options.initialize.call(this);
		},

		onStateChange: function() {
			if (this.transport.readyState == 4 && this.running) {
				this.running = false;
				this.status = 0;
				try {
					this.status = this.transport.status;
					delete this.transport.onreadystatechange;
				} catch(e) {}
				if (this.options.isSuccess.call(this, this.status)) {
					this.response = {
						text: this.transport.responseText,
						xml: this.transport.responseXML
					};
					this.fireEvent('success', this.response.text, this.response.xml);
					this.callChain();
				} else {
					this.fireEvent('failure');
				}
			}
		},

		isSuccess: function() {
			return !this.status || this.status >= 200 && this.status < 300;
		},

		setHeader: function(name, value) {
			this.headers[name] = value;
			return this;
		},

		getHeader: function(name) {
			try {
				if (this.transport) return this.transport.getResponseHeader(name);
			} catch(e) {}
			return null;
		},

		onFrameLoad: function() {
			var frame = this.frame && this.frame.iframe;
			if (frame && frame.location != 'about:blank') {
				var doc = (frame.contentDocument || frame.contentWindow || frame).document;
				var text = doc && doc.body && (doc.body.innerHTML || doc.body.innerText);
				if (text != null) {
					// First tag in IE ends up in <head>, safe it
					// res.text = res.text.replace(/<title><\/title>/gi, "")
					//	.replace(/^(<head>([\s\S]*)<\/head>\s*<body>|<body>)([\s\S]*)<\/body>$/gi, "$2$3");
					var head = Browser.IE && doc.getElementsByTagName('head')[0];
					text = (head && head.innerHTML || '') + text;
					this.response = { text: text };
					this.fireEvent('success', text);
					this.callChain();
					// Some browsers need this object around for a while...
					this.frame.div.remove.bind(this.frame.div).delay(1000);
					this.frame = null;
				}
			}
		},

		send: function(url, data) {
			if (this.options.autoCancel) this.cancel();
			else if (this.running) return this;
			if (data === undefined) {
				data = url || '';
				url = this.url;
			}
			data = data || this.options.data;
			this.running = true;
			var method = this.options.method;
			if (data && $typeof(data) == 'element') { // a form: use iframe
		 		createFrame(this, DomElement.get(data));
			} else {
				createRequest(this);
				if (!this.transport) {
					createFrame(that);
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
					this.timer = checkFrame.bind(this).periodic(50);
#endif // !BROWSER_LEGACY
				if (this.frame.form)
					this.frame.form.set({
						target: this.frame.id, action: url, method: method,
						// Firefox does not seem to support setting charset= on enctype here, so leave it away...
						enctype: method == 'get' ? 'application/x-www-form-urlencoded' : 'multipart/form-data'
					}).submit();
				else
					this.frame.element.setProperty('src', url);
			} else if (this.transport) {
				try {
					this.transport.open(method.toUpperCase(), url, this.options.async);
					this.transport.onreadystatechange = this.onStateChange.bind(this);
					if (method == 'post' && this.transport.overrideMimeType)
						this.setHeader('Connection', 'close');
					this.headers.merge(this.options.headers).each(function(header, name) {
						try{
							this.transport.setRequestHeader(name, header);
						} catch(e) {
							this.fireEvent('exception', [e, name, header]);
						}
					}, this);
					this.fireEvent('request');
					this.transport.send(data);
					if (!this.options.async)
						this.onStateChange();
				} catch(e) {
					this.fireEvent('failure', e);
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

HttpRequest.inject(Chain).inject(Callback);

#endif // __lang_HttpRequest__