#ifndef __browser_html_Dimension__
#define __browser_html_Dimension__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif

#include "HtmlElement.js"

////////////////////////////////////////////////////////////////////////////////
// Dimension

HtmlElement.inject(new function() {
#ifdef BROWSER_LEGACY
	function cumulate(name, parent, iter, fix) {
		fix = fix && Browser.MACIE;
#else // !BROWSER_LEGACY
	function cumulate(name, parent, iter) {
#endif // !BROWSER_LEGACY
		var left = name + 'Left', top = name + 'Top';
		return function(that) {
			var cur, next = that, x = 0, y = 0;
			do {
				cur = next;
				x += cur.$[left] || 0;
				y += cur.$[top] || 0;
			} while((next = HtmlElement.get(cur.$[parent])) && (!iter || iter(cur, next)))
#ifdef BROWSER_LEGACY
			// Fix body on mac ie
			if (fix) ['margin', 'padding'].each(function(val) {
				x += that.getStyle(val + '-left').toInt() || 0;
				y += that.getStyle(val + '-top').toInt() || 0;
			}, cur); // TODO: is it correct to pass cur here??? Verify on Mac IE
#endif // BROWSER_LEGACY
			return { x: x, y: y };
		}
	}

	function bounds(fields, offset) {
		// Pass one of these:
		// (left, top, width, height, clip)
		// ([left, top, width, height, clip])
		// ({ left: , top: , width: , height: , clip: })
		// Do not set bounds, as arguments would then be modified, which we're
		// referencing here:
		return function(values) {
			var vals = /^(object|array)$/.test(Base.type(values)) ? values : arguments;
			if (offset) {
				if (vals.x) vals.left = vals.x;
				if (vals.y) vals.top = vals.y;
			}
			var i = 0;
			return fields.each(function(name) {
				var val = vals.length ? vals[i++] : vals[name];
				if (val != null) this.setStyle(name, val);
			}, this);
		}
	}

	function body(that) {
		return that.getTag() == 'body';
	}

	var getCumulative = cumulate('offset', 'offsetParent', Browser.WEBKIT ? function(cur, next) {
		// Safari returns margins on body which is incorrect if the
		// child is absolutely positioned.
		return next.$ != document.body || cur.getStyle('position') != 'absolute';
	} : null, true);

	var getPositioned = cumulate('offset', 'offsetParent', function(cur, next) {
		return next.$ != document.body && !/^(relative|absolute)$/.test(next.getStyle('position'));
	});

	var getScrollOffset = cumulate('scroll', 'parentNode');

	var fields = {
		getSize: function() {
			return body(this)
				? this.getView().getSize()
				: { width: this.$.offsetWidth, height: this.$.offsetHeight };
		},

		getOffset: function(positioned) {
			return body(this)
				? this.getView().getOffset()
			 	: (positioned ? getPositioned : getCumulative)(this);
		},

		getScrollOffset: function() {
			return body(this)
				? this.getView().getScrollOffset()
			 	: getScrollOffset(this);
		},

		getScrollSize: function() {
			return body(this)
				? this.getView().getScrollSize()
			 	: { width: this.$.scrollWidth, height: this.$.scrollHeight };
		},

		getBounds: function() {
			if (body(this))
				return this.getView().getBounds();
			var off = this.getOffset(), el = this.$;
			return {
				left: off.x,
				top: off.y,
				right: off.x + el.offsetWidth,
				bottom: off.y + el.offsetHeight,
				width: el.offsetWidth,
				height: el.offsetHeight
			};
		},

		setBounds: bounds(['left', 'top', 'width', 'height', 'clip'], true),

		setOffset: bounds(['left', 'top'], true),

		setSize: bounds(['width', 'height', 'clip']),

		contains: function(pos) {
			var bounds = this.getBounds();
			return pos.x >= bounds.left && pos.x < bounds.right &&
				pos.y >= bounds.top && pos.y < bounds.bottom;
		},

		scrollTo: function(x, y) {
			if (body(this)) {
				this.getView().scrollTo(x, y);
			} else {
				// Convert { x: y: } to x / y
				var off = typeof x == 'object' ? x : { x: x, y: y };
				this.$.scrollLeft = off.x;
				this.$.scrollTop = off.y;
			}
			return this;
		},
		
		statics: {
			getAt: function(pos, exclude) {
				var el = this.getDocument().getElement('body');
				while (true) {
					var max = -1;
					var ch = el.getFirst();
					while (ch) {
						if (ch.contains(pos) && ch != exclude) {
							var z = ch.style.zIndex.toInt() || 0;
							if (z >= max) {
								el = ch;
								max = z;
							}
						}
						ch = ch.getNext();
					}
					if (max < 0) break;
				}
				return el;
			}
		}
	};

	// Dimension getters and setters:
	['left', 'top', 'right', 'bottom', 'width', 'height'].each(function(name) {
		var part = name.capitalize();
		fields['get' + part] = function() {
			return this.$['offset' + part];
		};
		fields['set' + part] = function(value) {
			// Check for isNaN since it might be values like 'auto' too:
			this.$.style[name] = isNaN(value) ? value : value + 'px';
		};
	});

	return fields;
});

// Inject dimension methods into both HtmlDocument and HtmlView.
// Use the bind object in each to do so:
[HtmlDocument, HtmlView].each(function(ctor) {
	ctor.inject(this);
}, {
	getSize: function() {
		var doc = this.getDocument().$, view = this.getView().$, html = doc.documentElement;
		return Browser.WEBKIT2 && { width: view.innerWidth, height: view.innerHeight }
			|| Browser.OPERA && { width: doc.body.clientWidth, height: doc.body.clientHeight }
			|| { width: html.clientWidth, height: html.clientHeight };
	},

	getScrollOffset: function() {
		var doc = this.getDocument().$, view = this.getView().$, html = doc.documentElement;
		return {
			x: view.pageXOffset || html.scrollLeft || doc.body.scrollLeft || 0,
			y: view.pageYOffset || html.scrollTop || doc.body.scrollTop || 0
		}
	},

	getScrollSize: function() {
		var doc = this.getDocument().$, html = doc.documentElement;
		return Browser.IE && { x: Math.max(html.clientWidth, html.scrollWidth), y: Math.max(html.clientHeight, html.scrollHeight) }
			|| Browser.WEBKIT && { x: doc.body.scrollWidth, y: doc.body.scrollHeight }
			|| { x: html.scrollWidth, y: html.scrollHeight };
	},

	getOffset: function(){
		return { x: 0, y: 0 };
	},

	getBounds: function(){
		var size = this.getSize();
		return {
			left: 0, top: 0,
			right: size.width, bottom: size.height,
			width: size.width, height: size.height
		};
	},

	scrollTo: function(x, y) {
		// Convert { x: y: } to x / y
		var off = typeof x == 'object' ? x : { x: x, y: y };
		this.getView().$.scrollTo(off.x, off.y);
		return this;
	}
});

#endif // __browser_html_Dimension__