#ifndef __browser_html_Style__
#define __browser_html_Style__

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
	var styles = {
		all: {
			width: '@px', height: '@px', left: '@px', top: '@px', right: '@px', bottom: '@px',
			color: 'rgb(@, @, @)', backgroundColor: 'rgb(@, @, @)', backgroundPosition: '@px @px',
			fontSize: '@px', letterSpacing: '@px', lineHeight: '@px', textIndent: '@px',
			margin: '@px @px @px @px', padding: '@px @px @px @px', border: '@px @ rgb(@, @, @) @px @ rgb(@, @, @) @px @ rgb(@, @, @) @px @ rgb(@, @, @)',
			borderWidth: '@px @px @px @px', borderStyle: '@ @ @ @', borderColor: 'rgb(@, @, @) rgb(@, @, @) rgb(@, @, @) rgb(@, @, @)',
			clip: 'rect(@px, @px, @px, @px)'
		},
		part: {
			'margin': {}, 'padding': {}, 'border': {}, 'borderWidth': {}, 'borderStyle': {}, 'borderColor': {}
		}
	};

	['Top', 'Right', 'Bottom', 'Left'].each(function(dir) {
		['margin', 'padding'].each(function(style) {
			var sd = style + dir;
			styles.part[style][sd] = styles.all[sd] = '@px';
		});
		var bd = 'border' + dir;
		styles.part.border[bd] = styles.all[bd] = '@px @ rgb(@, @, @)';
		var bdw = bd + 'Width', bds = bd + 'Style', bdc = bd + 'Color';
		styles.part[bd] = {};
		styles.part.borderWidth[bdw] = styles.part[bd][bdw] = '@px';
		styles.part.borderStyle[bds] = styles.part[bd][bds] = '@';
		styles.part.borderColor[bdc] = styles.part[bd][bdc] = 'rgb(@, @, @)';
	});

	// Now pre-split all style.all settings at ' ', instead of each time
	// in setStyles
	Base.each(styles.all, function(val, name) {
		this[name] = val.split(' ');
	});

	var fields = {
		getStyle: function(name, dontCompute) {
			if (name == undefined) return this.getStyles();
			var el = this.$;
			name = name.camelize();
			var style = el.style[name];
			if (!style && style != 0 || /auto|inherit/.test(style)) {
				if (name == 'opacity') {
					var op = this.opacity;
					return op || op == 0 ? op : this.getVisible() ? 1 : 0;
				}
				if (styles.part[name]) {
					style = Hash.map(styles.part[name], function(val, key) {
						return this.getStyle(key);
					}, this);
					return style.every(function(val) {
						return val == style[0];
					}) ? style[0] : style.join(' ');
				}
				// el.currentStyle: IE, document.defaultView: everything else
				style = document.defaultView && document.defaultView.getComputedStyle(el, null).getPropertyValue(name.hyphenate())
					|| el.currentStyle && el.currentStyle[name];
			}
			// TODO: this does not belong here
			if (name == 'visibility')
				return /^(visible|inherit(|ed))$/.test(style);
#ifdef __lang_Color__
			var color = style && style.match(/rgb[a]?\([\d\s,]+\)/);
			if (color) return style.replace(color[0], color[0].rgbToHex());
#endif // !__lang_Color__
			if (Browser.IE && isNaN(parseInt(style))) {
				// Fix IE style:
				if (/^(width|height)$/.test(name)) {
					var size = 0;
					(name == 'width' ? ['left', 'right'] : ['top', 'bottom']).each(function(val) {
						size += this.getStyle('border-' + val + '-width').toInt() + this.getStyle('padding-' + val).toInt();
					}, this);
					return (this.$['offset' + name.capitalize()] - size) + 'px';
				} else if (name.test(/border(.+)Width|margin|padding/)) {
					return '0px';
				}
			}
			return style;
		},

		setStyle: function(name, value) {
			if (value == undefined) return this.setStyles(name);
			// Convert multi params to array:
			if (arguments.length > 2) value = Array.slice(arguments, 1);
			var el = this.$;
			switch (name) {
			case 'visibility':
				el.style.visibility = typeof value == 'string' ? value : value ? 'visible' : 'hidden';
				return this;
			case 'opacity':
				if (!el.currentStyle || !el.currentStyle.hasLayout) el.style.zoom = 1;
				if (Browser.IE) el.style.filter = value > 0 && value < 1 ? 'alpha(opacity=' + value * 100 + ')' : '';
				el.style.opacity = this.opacity = value;
				return this.setStyle('visibility', !!value);
			case 'float':
				name = Browser.IE ? 'styleFloat' : 'cssFloat';
				break;
			default:
				name = name.camelize();
			}
			var type = $typeof(value);
			if (value && type != 'string') {
				var parts = styles.all[name] || ['@'], index = 0;
				// Flatten arrays, e.g. for borderColor where it might be an
				// array of four color arrays.
				value = (type == 'array' ? value.flatten() : [value]).map(function(val) {
					var part = parts[index++];
					if (!part) throw $break;
					return $typeof(val) == 'number' ? part.replace('@', Math.round(val)) : val;
				}).join(' ');
			}
			el.style[name] = value;
			return this;
		},

		getStyles: function() {
			return arguments.length ? Base.each(arguments, function(name) {
				this[name] = that.getStyle(name);
			}, {}) : this.$.style.cssText;
		},

		setStyles: function(styles) {
			switch ($typeof(styles)) {
			case 'object':
				Base.each(styles, function(style, name) {
					// only set styles that have a defined value (null !== undefined)
					if (style !== undefined)
						this.setStyle(name, style);
				}, this);
				break;
			case 'string':
				this.$.style.cssText = styles;
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

#endif // __browser_html_Style__