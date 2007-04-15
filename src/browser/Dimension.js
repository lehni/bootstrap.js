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

#include "Element.js"

////////////////////////////////////////////////////////////////////////////////
// Dimension

Element.inject(function() {
#ifdef BROWSER_LEGACY
	function cumulate(name, parent, iter, fix) {
		fix = fix && Browser.MACIE;
#else // !BROWSER_LEGACY
	function cumulate(name, parent, iter) {
#endif // !BROWSER_LEGACY
		var left = name + 'Left', top = name + 'Top';
		return function() {
			var el, next = this, x = 0, y = 0;
			do {
				el = next;
				x += el[left] || 0;
				y += el[top] || 0;
			} while((next = el[parent]) && (!iter || iter(el)))
#ifdef BROWSER_LEGACY
			// fix body on mac ie
			if (fix) ['margin', 'padding'].each(function(val) {
				x += this.getStyle(val + '-left').toInt() || 0;
				y += this.getStyle(val + '-top').toInt() || 0;
			}, $(el));
#endif // BROWSER_LEGACY
			return { x: x, y: y };
		}
	}

	return {
		getSize: function() {
			return { width: this.offsetWidth, height: this.offsetHeight };
		},

		getOffset: cumulate('offset', 'offsetParent', Browser.KHTML ? function(el) {
			// Safari returns margins on body which is incorrect if the
			// child is absolutely positioned.
			return el.offsetParent != document.body ||
				$(el).getStyle('position') != 'absolute';
		} : null, true),

		getRelativeOffset: cumulate('offset', 'offsetParent', function(el) {
	        return Element.prototype.getTag.call(el) != 'body' &&
				!/^(relative|absolute)$/.test(Element.prototype.getStyle.call(el, 'position'))
		}),

		// TODO: needed?
		getScrollOffset: cumulate('scroll', 'parentNode'),

		// TODO: consider rename:
		getScrollPos: function() {
			return { x: this.scrollLeft, y: this.scrollTop };
		},

		getScrollSize: function() {
			return { width: this.scrollWidth, height: this.scrollHeight };
		},

		getBounds: function() {
			var off = this.getOffset();
			return {
				width: this.offsetWidth,
				height: this.offsetHeight,
				left: off.x,
				top: off.y,
				right: off.x + this.offsetWidth,
				bottom: off.y + this.offsetHeight
			};
		},

		setBounds: function(bounds) {
			this.setStyles(bounds.each(function(val, i) {
				if (val || val == 0) this[i] = val + 'px';
			}, { position: 'absolute' }));
		},

		scrollTo: function(x, y) {
			this.scrollLeft = x;
			this.scrollTop = y;
		}
	};
});

#endif // __browser_Dimension__