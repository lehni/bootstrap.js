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

	var fields = {
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

		// TODO: Needed?
		getScrollOffset: cumulate('scroll', 'parentNode'),

		// TODO: Consider rename:
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
			// convert (left, top, width, height, clip) or ([left, top, width, height, clip]) to ({ left: , top: , width: , height: , clip: })
			if (arguments.length > 1 || !bounds || bounds.push)
				bounds = (bounds && bounds.push ? bounds : $A(arguments)).assign(
						['left', 'top', 'width', 'height', 'clip']);
			// clip: if specified as an array, set directly, otherwise set to
			// native bounds afterwards
			var clip = bounds.clip && !bounds.clip.push;
			if (clip) delete bounds.clip;
			// apply:
			this.setStyles(EACH(bounds, function(val, i) {
				if (val || val == 0) this[i] = val + 'px';
			}, { position: 'absolute' }));
			// for clipping, do not rely on #width and #height to be set.
			// setBounds might be called with only #width, #height, #right or #bottom set.
			if (clip) this.setClip(0, this.getWidth(), this.getHeight(), 0);
			return this;
		},

		contains: function(pos) {
			var bounds = this.getBounds();
			return pos.x >= bounds.left && pos.x < bounds.right &&
				pos.y >= bounds.top && pos.y < bounds.bottom;
		},

		scrollTo: function(x, y) {
			this.scrollLeft = x;
			this.scrollTop = y;
		},
		
		$static: {
			getAt: function(pos, exclude) {
				var el = $('body');
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
	$A('left top right bottom width height').each(function(name) {
		var part = name.capitalize();
		fields['get' + part] = function() {
			return this['offset' + part];
		};
		fields['set' + part] = function(value) {
			this.style[name] = value + 'px';
		};
	});

	return fields;
});

#endif // __browser_Dimension__