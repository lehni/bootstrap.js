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
	var methods = {
		getStyle: function(name, dontCompute) {
			name = name.camelize();
			var style = this.style[name];
			if (!style) switch (name) {
				case 'opacity':
					return this.opacity || this.opacity == 0 ? this.opacity : this.getVisible() ? 1 : 0;
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
			// case 'clip': if (name == 'clip') // TODO: split clip rect!
			// TODO: color! return (style && /color/i.test(name) && /rgb/.test(style)) ? style.rgbToHex() : style;
			return style;
		},

		setStyle: function(name, value) {
			// convert multi params to array:
			if (arguments.length > 2) value = $A(arguments, 1);
			switch (name) {
			case 'opacity':
				if (!this.currentStyle || !this.currentStyle.hasLayout) this.style.zoom = 1;
				if (Browser.IE) this.style.filter = value > 0 && value < 1 ? 'alpha(opacity=' + value * 100 + ')' : '';
				this.style.opacity = this.opacity = value;
				this.setVisible(value);
				break;
			case 'clip':
				this.style.clip = $typeof(value) == 'array' ? 'rect(' + value.join('px ') + 'px)' : value;
				break;
			default:
				this.style[name.camelize()] = value; // TODO: color! (value.push) ? 'rgb(' + value.join(',') + ')' : value;
			}
			return this;
		},

		getStyles: function() {
			return arguments.each(function(val) {
				this[val] = that.getStyle(val);
			}, {});
		},

		setStyles: function(styles) {
			switch ($typeof(styles)) {
			case 'object':
				styles.each(function(style, name) {
					this.setStyle(name, style);
				}, this);
				break;
			case 'string':
				this.cssText = styles;
			}
			return this;
		},

		getVisible: function() {
			var vis = this.getStyle('visibility');
			return vis == 'visible' || vis == 'inherit' || vis == 'inherited' || vis == '';
		},

		setVisible: function(visible) {
			return this.setStyle('visibility', visible ? 'inherit' : 'hidden');
		},

		getZIndex: function() {
			return this.getStyle('zIndex').toInt() || 0;
		},

		setZIndex: function(value) {
			this.style.zIndex = value;
		}
	};

	// Create getters and setters for some often used css properties:
	$A('opacity color background border margin padding clip display').each(function(name) {
		var part = name.capitalize();
		methods['get' + part] = function() {
			return this.getStyle(name);
		};
		methods['set' + part] = function(value) {
			// pass mutliple params as array
			return this.setStyle(name, arguments.length > 1 ? $A(arguments) : value);
		};
	});

	// Dimension properties:
	$A('left top width height').each(function(name) {
		var part = name.capitalize();
		methods['get' + part] = function() {
			return this['offset' + part];
		};
		methods['set' + part] = function(value) {
			this.style[name] = Math.round(value) + 'px';
		};
	});

	return methods;
});

#endif // __browser_Style__