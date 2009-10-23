#ifndef __browser_html_Style__
#define __browser_html_Style__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif // HIDDEN

#include "HtmlElement.js"

////////////////////////////////////////////////////////////////////////////////
// Style

HtmlElement.inject(new function() {
	var styles = {
		all: {
			width: '@px', height: '@px', left: '@px', top: '@px', right: '@px', bottom: '@px',
			color: 'rgb(@, @, @)', backgroundColor: 'rgb(@, @, @)', backgroundPosition: '@px @px',
			fontSize: '@px', letterSpacing: '@px', lineHeight: '@px', textIndent: '@px',
			margin: '@px @px @px @px', padding: '@px @px @px @px',
			border: '@px @ rgb(@, @, @) @px @ rgb(@, @, @) @px @ rgb(@, @, @) @px @ rgb(@, @, @)',
			borderWidth: '@px @px @px @px', borderStyle: '@ @ @ @',
			borderColor: 'rgb(@, @, @) rgb(@, @, @) rgb(@, @, @) rgb(@, @, @)',
			clip: 'rect(@px, @px, @px, @px)', opacity: '@'
		},
		part: {
			'border': {}, 'borderWidth': {}, 'borderStyle': {}, 'borderColor': {},
			'margin': {}, 'padding': {}
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
		_BEANS

		getComputedStyle: function(name) {
			if (this.$.currentStyle) return this.$.currentStyle[name.camelize()];
			var style = this.getWindow().$.getComputedStyle(this.$, null);
			return style ? style.getPropertyValue(name.hyphenate()) : null;
		},

		getStyle: function(name) {
			if (name === undefined) return this.getStyles();
			if (name == 'opacity') {
				var op = this.opacity;
				return op || op == 0 ? op : this.getVisibility() ? 1 : 0;
			}
			var el = this.$;
			name = name.camelize();
			var style = el.style[name];
			if (!Base.check(style)) {
				if (styles.part[name]) {
					style = Hash.map(styles.part[name], function(val, key) {
						return this.getStyle(key);
					}, this);
					return style.every(function(val) {
						return val == style[0];
					}) ? style[0] : style.join(' ');
				}
				style = this.getComputedStyle(name);
			}
			// TODO: this does not belong here
			if (name == 'visibility')
				return /^(visible|inherit(|ed))$/.test(style);
#ifdef __lang_Color__
			var color = style && style.match(/rgb[a]?\([\d\s,]+\)/);
			if (color) return style.replace(color[0], color[0].rgbToHex());
#endif // !__lang_Color__
			if (Browser.PRESTO || (Browser.TRIDENT && isNaN(parseInt(style)))) {
				// Fix IE / Opera style that falsly include border and padding:
				if (/^(width|height)$/.test(name)) {
					var size = 0;
					(name == 'width' ? ['left', 'right'] : ['top', 'bottom']).each(function(val) {
						size += this.getStyle('border-' + val + '-width').toInt() + this.getStyle('padding-' + val).toInt();
					}, this);
					// TODO: Should 'scroll' be used instead, as 'offset' also includes the scroll bars?
					return this.$['offset' + name.capitalize()] - size + 'px';
				}
				if (Browser.PRESTO && /px/.test(style)) return style;
				if (/border(.+)[wW]idth|margin|padding/.test(name)) return '0px';
			}
			return style;
		},

		setStyle: function(name, value) {
			if (value === undefined) return this.setStyles(name);
			var el = this.$;
			switch (name) {
				case 'float':
					name = Browser.TRIDENT ? 'styleFloat' : 'cssFloat';
					break;
				case 'clip':
					// Setting clip to true sets it to the current bounds
					// TODO: Calculate only if Dimension.js is defined? add conditional macro?
					if (value == true)
						value = [0, el.offsetWidth, el.offsetHeight, 0];
					break;
				default:
					name = name.camelize();
			}
			var type = Base.type(value);
			if (value != undefined && type != 'string') {
				var parts = styles.all[name] || ['@'], index = 0;
				// Flatten arrays, e.g. for borderColor where it might be an
				// array of four color arrays.
				value = (type == 'array' ? value.flatten() : [value]).map(function(val) {
					var part = parts[index++];
					if (!part)
						throw Base.stop;
					return Base.type(val) == 'number' ? part.replace('@', name == 'opacity' ? val : Math.round(val)) : val;
				}).join(' ');
			}
			switch (name) {
				case 'visibility':
					// Convert 0 to false, 1 to true before converting to visible / hidden
					if (!isNaN(value)) value = !!value.toInt() + '';
					// Convert true -> visible, false -> hidden, everything else remains unchanged
				 	value = value == 'true' && 'visible' || value == 'false' && 'hidden' || value;
					break;
				case 'opacity':
					this.opacity = value = parseFloat(value);
					this.setStyle('visibility', !!value);
					// Set opacity to 1 if it's 0 and set visibility to 0 instead,
					// to fix a problem on Firefox on Mac, where antialiasing is affected
					// otherwise... TODO: Find better solution?
					if (!value) value = 1;
					if (!el.currentStyle || !el.currentStyle.hasLayout) el.style.zoom = 1;
					if (Browser.TRIDENT) el.style.filter = value > 0 && value < 1 ? 'alpha(opacity=' + value * 100 + ')' : '';
					el.style.opacity = value;
					return this;
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
			switch (Base.type(styles)) {
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
	// TODO: Add more?
	['opacity', 'color', 'background', 'visibility', 'clip', 'zIndex',
		'border', 'margin', 'padding', 'display'].each(function(name) {
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