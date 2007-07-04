// HttpRequest library by Juerg Lehni, http://www.scratchdisk.com/
//
// Inspired by:
//
//   XHConn - Simple XMLHTTP Interface by bfults@gmail.com
//   HTMLHttpRequest v1.0 beta2, (c) Angus Turnbull, TwinHelix Designs http://www.twinhelix.com
//   PORK.iframe by Jelle Ursem, http://beta.zapguide.nl/iframe/

HttpRequest = Base.extend(new function() {
	var unique = 0;

	function checkFrame() {
		var l = this.frame.location;
		if (l && (!l.href || l.href.indexOf(this.url) != -1) && this.frame.document.readyState == 'complete') {
			this.onFrameLoad();
			this.timer.clear();
		}
	}

	return {
		initialize: function() {
		 	this.id = 'request_' + unique++;
			HttpRequest.requests[this.id] = this;
		},

		send: function(url, method, params, onLoad) {
			this.url = url;
			this.onLoad = onLoad;
			var method = method ? method.toUpperCase() : "GET";
			var form = null, req = null;
			if (params && params.elements) { // a form: use iframe
		 		this.createFrame();
				form = params;
			} else if (method != "GET") { // post: use iframe
				this.createFrame();
				form = this.createForm(params);
			} else {
				req = this.createXml();
				if (!req) {
					this.createFrame();
					if (this.url.indexOf('?') == -1) this.url += '?'; // for MACIE to load .js
				}
			}
			if (req) {
				req.open(method, this.url, true);
				req.send(null);
			} else if (this.frame) {
			 	// Opera fix: force the frame to render
				this.frameDiv.offsetWidth;
				if (Browser.IE5) {
					if (form && Browser.MAC)
						form.enctype = method == "GET" ? "application/x-www-form-urlencoded" : "multipart/form-data";
					this.timer = checkFrame.bind(this).periodic(50);
				}
				if (form) {
					form.target = this.id;
					form.action = this.url;
					form.method = method;
					form.submit();
				} else {
					var that = this;
					(function() { // timeout for opera
						that.frame.location = that.url;
					}).delay(1);
				}
			} 
		},

		createXml: function() {
			var req = null;
			try { req = new XMLHttpRequest(); } catch(e) {
			try { req = new ActiveXObject('Msxml2.XMLHTTP'); } catch(e) {
			try { req = new ActiveXObject('Microsoft.XMLHTTP'); } catch(e) {} } }
			if (req) {
				var obj = this;
				req.onreadystatechange = function() {
					if (req.readyState == 4 && req.status == 200) {
						obj.onLoad(req.responseText);
					}
				}
			}
			return req;
		},

		createFrame: function() {
			var d = document.createElement('div');
		    d.style.position = "absolute";
			d.style.top = "0";
			d.style.marginLeft = "-10000px";
			$('body').appendChild(d);
			if (Browser.IE) {
				d.innerHTML = '<iframe name="' + this.id + '" id="' + this.id + '" src="about:blank" onload="HttpRequest.requests[\'' + this.id + '\'].onFrameLoad()"></iframe>';
			} else {
				var f = document.createElement("iframe");
				f.setAttribute("name", this.id);
				f.setAttribute("id", this.id);
				var obj = this;
				f.addEventListener("load", function() { obj.onFrameLoad(); }, false);
				d.appendChild(f);
			}
			this.frame = window.frames[this.id] || $(this.id);
			this.frameDiv = d;
		},

		createForm: function(params) { // depends on createFrame
			params = params || {};
			var pos = this.url.indexOf('?');
			if (pos > 0) {
				// convert query strings back to param lists, as the values would be ignored on some browsers otherwise
				var ps = this.url.substring(pos + 1).split('&');
				ps.each(function(p, i) {
					p = p.split('=');
					params[p[0]] = unescape(p[1]);
				});
				this.url = this.url.substring(0, pos);
			}
			// create form entries for each value
			var s = '';
			params.each(function(p, i) {
				s += '<input type="hidden" name="' + i + '" value="' + p + '">';
			});
			var d = document.createElement('div');
			d.style.visibility = 'hidden';
			d.innerHTML = '<form>' + (s || '<input>') + '</form>'; // min. one empty input for MACIE
			var f = d.firstChild;
			$('body').appendChild(d);
			this.formDiv = d;
			return f;
		},

		onFrameLoad: function() {
			if (this.frame.location == "about:blank")
				return;
			var docs = [
				this.frame.contentDocument, // NS6
				this.frame.contentWindow, 	// IE5.5 and IE6
				this.frame					// IE5
			];
			var text;
			docs.each(function(d) {
				try {
					d = d.document;
					text = d.body.innerHTML;
					d.close();
					throw $break;
				} catch(e) {}
			});
			if (text == null) {
				try {
					text = window.frames[this.id].document.body.innerText;
				} catch(e) {}
			}
			if (text != null) {
				// first tag in IE ends up in <head>, safe it
				text = text.replace(/<TITLE><\/TITLE>/gi, "").replace(/^(<HEAD>([\s\S]*)<\/HEAD>\s*<BODY>|<BODY>)([\s\S]*)<\/BODY>$/gi, "$2$3");
				this.onLoad(text);
				if (this.formDiv) {
					$('body').removeChild(this.formDiv);
					this.formDiv = null;
				}
				var obj = this;
				// some browsers need this object around for a while...
				if (this.frameDiv)
					setTimeout(function() { try { obj.body.removeChild(obj.frameDiv) } catch(e) {} }, 1);
			}
		},

		statics: {
			requests: {},

			loadJs: function(url, onLoad) {
				new HttpRequest().send(url, "GET", null, function(js) {
					js = js.replace(/function ([^\(]*)\(/gi, '$1 = function(');
					if (Browser.MACIE)
						js = js.replace(/^<FONT size=\+1>([\s\S]*)<\/FONT>$/gi, '$1');
					if (js.indexOf('<PRE>') == 0)
						js = js.replace(/^<PRE>([\s\S]*)<\/PRE>$/gi, '$1').replace(/\&amp;/gi, '&').replace(/\&lt;/gi, '<').replace(/\&gt;/gi, '>').replace(/\&quot;/gi, '"');
					try {
						window.eval(js);
						if (onLoad)
							onLoad();
					} catch(e) {
						alert(e);
					}
				});
			},

			load: function(url, onLoad) {
				new HttpRequest().send(url, "GET", null, onLoad);
			}
		}
	}
})
