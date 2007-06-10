#ifndef __browser_Form__
#define __browser_Form__

#include "HtmlElement.js"

////////////////////////////////////////////////////////////////////////////////
// Form

Form = HtmlElement.extend({
	_tag: 'form',

	/**
	 * Overrides getElements to only return form elements by default.
	 * Explicitely call with '*' to return all elements contained in this form.
	 */
	getElements: function(selectors) {
		return this.base(selectors || ['input', 'select', 'textarea']);
	},

	blur: function() {
		return this.getElements().each(function(el) {
			el.blur();
		}, this);
	},

	enable: function(enable) {
		return this.getElements().each(function(el) {
			el.enable(enable);
		}, this);
	}
});

FormElement = HtmlElement.extend({
	_methods: ['focus', 'blur'],

	enable: function(enable) {
		var disabled = !enable && enable !== undefined;
		if (disabled) this.$.blur();
		this.$.disabled = disabled;
	}
});

Input = FormElement.extend({
	_tag: 'input',
	_properties: ['type', 'value', 'checked', 'defaultChecked'],
	_methods: ['click'],

	getValue: function() {
		if (this.checked && /^(checkbox|radio)$/.test(this.$.type) ||
			/^(hidden|text|password)$/.test(this.$.type))
			return this.$.value;
	}
});

TextArea = FormElement.extend({
	_tag: 'textarea',
	_properties: ['value']
});

Select = FormElement.extend({
	_tag: 'select',
	_properties: ['type', 'selectedIndex'],

	/**
	 * Form Element constructors work in two ways:
	 * - Thew wrap an existing element, in which facse first is the elment
	 *   and second point to the properties to set.
	 * - They create a new element, in which case first point to the properties
	 *   to set and second might be something else, e.g. an array of options
	 *   for Select.
	 */
	initialize: function(first, second) {
		var wrapping = $typeof(first) == 'element';
		this.base(wrapping ? first : second, wrapping ? second : null);
		if (second && !wrapping) this.add.apply(this, second);
	},

	getSelected: function() {
		return this['getElement' + (this.$.type == 'select-one' ? '' : 's')]('option[selected=true]');
	},

	getValue: function() {
		var sel = this.getSelected
	},

	setSelected: function(value) {
		$each(this.$.options, function(opt, i) {
			if (opt == value || opt.value == value) {
				this.$.selectedIndex = i;
				throw $break;
			}
		}, this);
	}
});

// Name it SelectOption instead of Option, as Option is the native prototype.
SelectOption = FormElement.extend({
	_tag: 'option',
	_properties: ['text', 'value', 'selected', 'defaultSelected', 'index']
});

#endif // __browser_Form__	
