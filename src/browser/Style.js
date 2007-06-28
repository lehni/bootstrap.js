#ifndef __browser_Style__
#define __browser_Style__

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
// Style

HtmlElement.inject(new function() {
	var fields = {
		getStyle: function(name, dontCompute) {
			var el = this.$;
			name = name.camelize();
			var style = el.style[name];
			if (!style) switch (name) {
				case 'opacity':
					var op = this.opacity;
					return op || op == 0 ? op : this.getVisible() ? 1 : 0;
				case 'margin':
				case 'padding':
					var res = [];
					['top', 'right', 'bottom', 'left'].each(function(prop) {
						res.push(this.getStyle(property + '-' + prop, dontCompute) || '0');
					}, this);
					return res.every(function(val) {
						return val == res[0];
					}) ? res[0] : res;
			}
			if (!dontCompute) {
				// el.currentStyle: IE, document.defaultView: everything else
				if (!style) style = document.defaultView && document.defaultView.getComputedStyle(el, '').getPropertyValue(name.hyphenate())
					|| el.currentStyle && el.currentStyle[name];
				else if (style == 'auto' && /^(width|height)$/.test(name))
					return el['offset' + name.capitalize()] + 'px';
			}
			switch(name) {
			case 'visibility':
				return /^(visible|inherit(|ed))$/.test(style);
			// TODO:
			// case 'clip': if (name == 'clip') // TODO: split clip rect!
			// case 'zIndex': return style.toInt() || 0;
			}
			// TODO:
			// return (style && /color/i.test(name) && /rgb/.test(style)) ? style.rgbToHex() : style;
			return style;
		},

		setStyle: function(name, value) {
			// Convert multi params to array:
			if (arguments.length > 2) value = Array.slice(arguments, 1);
			var el = this.$;
			switch (name) {
			case 'visibility':
				el.style.visibility = typeof value == 'string' ? value : value ? 'visible' : 'hidden';
				break;
			case 'opacity':
				if (!el.currentStyle || !el.currentStyle.hasLayout) el.style.zoom = 1;
				if (Browser.IE) el.style.filter = value > 0 && value < 1 ? 'alpha(opacity=' + value * 100 + ')' : '';
				el.style.opacity = this.opacity = value;
				this.setStyle('visibility', !!value);
				break;
			case 'clip':
				// TODO: Calculate only if Dimension.js is defined? add conditional macro?
				if (value == true) value = [0, el.offsetWidth, el.offsetHeight, 0];
				el.style.clip = value.push ? 'rect(' + value.join('px ') + 'px)' : value;
				break;
			default:
				el.style[name.camelize()] = value; // TODO: color! (value.push) ? 'rgb(' + value.join(',') + ')' : value;
			}
			return this;
		},

		getStyles: function() {
			return EACH(arguments, function(name) {
				this[name] = that.getStyle(name);
			}, {});
		},

		setStyles: function(styles) {
			switch ($typeof(styles)) {
			case 'object':
				EACH(styles, function(style, name) {
					// only set styles that have a defined value (null !== undefined)
					if (style !== undefined)
						this.setStyle(name, style);
				}, this);
				break;
			case 'string':
				this.$.cssText = styles;
			}
			return this;
		}
	};

	// Create getters and setters for some often used css properties:
	// TODO: add more? e.g. border margin padding display
	// TODO: do clip and zIndex belong to Dimension.js?
	['opacity', 'color', 'background', 'visibility', 'clip', 'zIndex'].each(function(name) {
		var part = name.capitalize();
		fields['get' + part] = function() {
			return this.getStyle(name);
		};
		fields['set' + part] = function(value) {
			// pass mutliple params as array
			return this.setStyle(name, arguments.length > 1
				? Array.create(arguments) : value);
		};
	});

	return fields;
});

#endif // __browser_Style__