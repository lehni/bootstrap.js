#ifndef __browser_dom_Dimension__
#define __browser_dom_Dimension__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif // HIDDEN

#include "DomElement.js"

////////////////////////////////////////////////////////////////////////////////
// Dimension

// TODO: Consider splitting this into Position and Dimension, or naming it
// Measure instead
DomElement.inject(new function() {
#ifdef BROWSER_LEGACY
	function cumulate(name, parent, iter, fix) {
		fix = fix && Browser.TRIDENT && Browser.MAC;
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
			} while((next = DomNode.wrap(cur.$[parent])) && (!iter || iter(cur, next)))
#ifdef BROWSER_LEGACY
			// Fix body on Mac IE
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

	var getAbsolute = cumulate('offset', 'offsetParent', Browser.WEBKIT ? function(cur, next) {
		// Safari returns margins on body which is incorrect if the
		// child is absolutely positioned.
		return next.$ != document.body || cur.getStyle('position') != 'absolute';
	} : null, true);

	var getPositioned = cumulate('offset', 'offsetParent', function(cur, next) {
		return next.$ != document.body && !/^(relative|absolute)$/.test(next.getStyle('position'));
	});

	var getScrollOffset = cumulate('scroll', 'parentNode');

	var fields = {
		_BEANS

		getSize: function() {
			return body(this)
				? this.getWindow().getSize()
				: { width: this.$.offsetWidth, height: this.$.offsetHeight };
		},

		/**
		 * relative can either be a boolean value, indicating positioned (true)
		 * or absolute (false) offsets, or it can be an element in relation to
		 * which the offset is returned.
		 */
		getOffset: function(relative) {
			if (body(this))
				return this.getWindow().getOffset();
		 	if (relative && !DomNode.isNode(relative))
				return getPositioned(this);
			var off = getAbsolute(this);
			if (relative) {
				var rel = getAbsolute(DomNode.wrap(relative));
				off = { x: off.x - rel.x, y: off.y - rel.y };
			}
			return off;
		},

		getScrollOffset: function() {
			return body(this)
				? this.getWindow().getScrollOffset()
			 	: getScrollOffset(this);
		},

		getScrollSize: function() {
			return body(this)
				? this.getWindow().getScrollSize()
				: { width: this.$.scrollWidth, height: this.$.scrollHeight };
		},

		getBounds: function(relative) {
			if (body(this))
				return this.getWindow().getBounds();
			var off = this.getOffset(relative), el = this.$;
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

		setScrollOffset: function(x, y) {
			if (body(this)) {
				this.getWindow().setScrollOffset(x, y);
			} else {
				// Convert { x: y: } to x / y
				var off = typeof x == 'object' ? x : { x: x, y: y };
				this.$.scrollLeft = off.x;
				this.$.scrollTop = off.y;
			}
			return this;
		},

		scrollTo: function(x, y) {
			// Redirect to setScrollOffset, wich is there for symetry with getScrolloffset
			// Do not simply point to the same function, since setScrollOffset is overridden
			// for DomDocument and DomWindow.
			return this.setScrollOffset(x, y);
		},

		contains: function(pos) {
			var bounds = this.getBounds();
			return pos.x >= bounds.left && pos.x < bounds.right &&
				pos.y >= bounds.top && pos.y < bounds.bottom;
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

// Inject dimension methods into both DomDocument and Window.
// Use the bind object in each to do so:
[DomDocument, DomWindow].each(function(ctor) {
	ctor.inject(this);
}, {
	_BEANS

	getSize: function() {
		if (Browser.PRESTO || Browser.WEBKIT) {
			var win = this.getWindow().$;
			return { width: win.innerWidth, height: win.innerHeight };
		}
		var doc = this.getCompatElement();
		return { width: doc.clientWidth, height: doc.clientHeight };
	},

	getScrollOffset: function() {
		var win = this.getWindow().$, doc = this.getCompatElement();
		return { x: win.pageXOffset || doc.scrollLeft, y: win.pageYOffset || doc.scrollTop };
	},

	getScrollSize: function() {
		var doc = this.getCompatElement(), min = this.getSize();
		return { width: Math.max(doc.scrollWidth, min.width), height: Math.max(doc.scrollHeight, min.height) };
	},

	getOffset: function() {
		return { x: 0, y: 0 };
	},

	getBounds: function() {
		var size = this.getSize();
		return {
			left: 0, top: 0,
			right: size.width, bottom: size.height,
			width: size.width, height: size.height
		};
	},

	setScrollOffset: function(x, y) {
		// Convert { x: y: } to x / y
		var off = typeof x == 'object' ? x : { x: x, y: y };
		this.getWindow().$.scrollTo(off.x, off.y);
		return this;
	},

	getElementAt: function(pos, exclude) {
		var el = this.getDocument().getElement('body');
		while (true) {
			var max = -1;
			var ch = el.getFirst();
			while (ch) {
				if (ch.contains(pos) && ch != exclude) {
					var z = ch.$.style.zIndex.toInt() || 0;
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
	},

	getCompatElement: function() {
		var doc = this.getDocument();
		return doc.getElement(!doc.$.compatMode
				|| doc.$.compatMode == 'CSS1Compat' ? 'html' : 'body').$;
	}
});

#endif // __browser_dom_Dimension__