#ifndef __browser_Dimension__
#define __browser_Dimension__

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
		return function() {
			var cur, next = this, x = 0, y = 0;
			do {
				cur = next;
				x += cur.$[left] || 0;
				y += cur.$[top] || 0;
			} while((next = HtmlElement.get(cur.$[parent])) && (!iter || iter(cur, next)))
#ifdef BROWSER_LEGACY
			// Fix body on mac ie
			if (fix) ['margin', 'padding'].each(function(val) {
				x += this.getStyle(val + '-left').toInt() || 0;
				y += this.getStyle(val + '-top').toInt() || 0;
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
			var vals = /^(object|array)$/.test($typeof(values)) ? values : arguments;
			if (offset) {
				if (vals.x) vals.left = vals.x;
				if (vals.y) vals.top = vals.y;
			}
			var i = 0;
			return fields.each(function(name) {
				var val = vals.length ? vals[i++] : vals[name];
				if (val != null) this.setStyle(name, (name == 'clip') ? val : val + 'px');
			}, this);
		}
	}

	var getCumulative = cumulate('offset', 'offsetParent', Browser.WEBKIT ? function(cur, next) {
		// Safari returns margins on body which is incorrect if the
		// child is absolutely positioned.
		return next != document.body || cur.getStyle('position') != 'absolute';
	} : null, true);

	var getPositioned = cumulate('offset', 'offsetParent', function(cur, next) {
		return next != document.body && !/^(relative|absolute)$/.test(next.getStyle('position'));
	});

	var fields = {
		getSize: function() {
			return { width: this.$.offsetWidth, height: this.$.offsetHeight };
		},

		getOffset: function(positioned) {
			return (positioned ? getPositioned : getCumulative).apply(this);
		},

		getScrollOffset: cumulate('scroll', 'parentNode'),

		getScrollSize: function() {
			return { width: this.$.scrollWidth, height: this.$.scrollHeight };
		},

		getBounds: function() {
			var off = this.getOffset(), el = this.$;
			return {
				width: el.offsetWidth,
				height: el.offsetHeight,
				left: off.x,
				top: off.y,
				right: off.x + el.offsetWidth,
				bottom: off.y + el.offsetHeight
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

		// TODO: rename? (e.g. setScroll?)
		scrollTo: function(x, y) {
			this.scrollLeft = x;
			this.scrollTop = y;
		},
		
		statics: {
			getAt: function(pos, exclude) {
				var el = Document.getElement('body');
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
			// Only set px if it's not ending with a unit already 
			this.$.style[name] = /(%|px)$/.test(value) ? value : value + 'px';
		};
	});

	return fields;
});

#endif // __browser_Dimension__