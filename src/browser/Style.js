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

#include "Element.js"

////////////////////////////////////////////////////////////////////////////////
// Style

Element.inject(function() {
	var fields = {
		getStyle: function(name, dontCompute) {
			name = name.camelize();
			var style = this.style[name];
			if (!style) switch (name) {
				case 'opacity':
					var op = this.data.opacity;
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
				// this.currentStyle: IE, document.defaultView: everything else
				if (!style) style = document.defaultView && document.defaultView.getComputedStyle(this, '').getPropertyValue(name.hyphenate())
					|| this.currentStyle && this.currentStyle[name];
				else if (style == 'auto' && /^(width|height)$/.test(name))
					return this['offset' + name.capitalize()] + 'px';
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
			// convert multi params to array:
			if (arguments.length > 2) value = $A(arguments, 1);
			switch (name) {
			case 'visibility':
				this.style.visibility = typeof value == 'string' ? value : value ? 'visible' : 'hidden';
				break;
			case 'opacity':
				if (!this.currentStyle || !this.currentStyle.hasLayout) this.style.zoom = 1;
				if (Browser.IE) this.style.filter = value > 0 && value < 1 ? 'alpha(opacity=' + value * 100 + ')' : '';
				this.style.opacity = this.data.opacity = value;
				this.setStyle('visibility', !!value);
				break;
			case 'clip':
				// TODO: Calculate only if Dimension.js is defined? add conditional macro?
				if (value == true) value = [0, this.offsetWidth, this.offsetHeight, 0];
				this.style.clip = value.push ? 'rect(' + value.join('px ') + 'px)' : value;
				break;
			default:
				this.style[name.camelize()] = value; // TODO: color! (value.push) ? 'rgb(' + value.join(',') + ')' : value;
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
				this.cssText = styles;
			}
			return this;
		}
	};

	// Create getters and setters for some often used css properties:
	// TODO: add more? e.g. border margin padding display
	// TODO: do clip and zIndex belong to Dimension.js?
	$A('opacity color background visibility clip zIndex').each(function(name) {
		var part = name.capitalize();
		fields['get' + part] = function() {
			return this.getStyle(name);
		};
		fields['set' + part] = function(value) {
			// pass mutliple params as array
			return this.setStyle(name, arguments.length > 1 ? $A(arguments) : value);
		};
	});

	return fields;
});

#endif // __browser_Style__