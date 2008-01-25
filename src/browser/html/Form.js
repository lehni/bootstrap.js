#ifndef __browser_html_Form__
#define __browser_html_Form__

#include "HtmlElement.js"

////////////////////////////////////////////////////////////////////////////////
// Form

// Form related functions, but available in all elements:

HtmlElement.inject({
	getFormElements: function() {
		return this.getElements(['input', 'select', 'textarea']);
	},

	getValue: function(name) {
		var el = this.getElement(name);
		return el && el.getValue && el.getValue();
	},

	setValue: function(name, val) {
		var el = this.getElement(name);
		if (!el) el = this.injectBottom('input', { type: 'hidden', id: name, name: name });
		return el.setValue(val);
	},

	getValues: function() {
		return this.getFormElements().each(function(el) {
			var name = el.getName();
			if (name && !el.getDisabled()) this[name] = el.getValue(); 
		}, new Hash());
	},

	setValues: function(values) {
		return Base.each(values, function(val, name) {
			this.setValue(name, val);
		}, this);
	},

	toQueryString: function() {
		return Base.toQueryString(this.getValues());
	}
});

// TODO: Consider naming these FormElement, InputElement, TextAreaElement,
// SelectElement and OptionElement. Also, think of ImageElement (with setSrc...).

Form = HtmlElement.extend({
	_tag: 'form',
	_properties: ['action', 'method', 'target'],
	_methods: ['submit'],

	blur: function() {
		return this.getFormElements().each(function(el) {
			el.blur();
		}, this);
	},

	enable: function(enable) {
		return this.getFormElements().each(function(el) {
			el.enable(enable);
		}, this);
	}
});

FormElement = HtmlElement.extend({
	_properties: ['name', 'disabled'],
	_methods: ['focus', 'blur'],

	enable: function(enable) {
		var disabled = !enable && enable !== undefined;
		if (disabled) this.$.blur();
		this.$.disabled = disabled;
		return this;
	}
});

Input = FormElement.extend({
	_tag: 'input',
	_properties: ['type', 'checked', 'defaultChecked', 'readOnly', 'maxLength'],
	_methods: ['click'],

	getValue: function() {
		if (this.$.checked && /^(checkbox|radio)$/.test(this.$.type) ||
			/^(hidden|text|password|button|search)$/.test(this.$.type))
			return this.$.value;
	},

	// TODO: decide if setValue for checkboxes / radios should actually change
	// the value or set checked if the values match! Maybe a new function is
	// needed that does that, e.g. set / getCurrent
	setValue: function(val) {
		if (/^(checkbox|radio)$/.test(this.$.type)) this.$.checked = this.$.value == val;
		else this.$.value = val;
		return this;
	}
});

TextArea = FormElement.extend({
	_tag: 'textarea',
	_properties: ['value']
});

Select = FormElement.extend({
	_tag: 'select',
	_properties: ['type', 'selectedIndex'],

	getOptions: function() {
		return this.getElements('option');
	},

	getSelected: function() {
		return this.getElements('option[selected]');
	},

	getValue: function() {
		return this.getSelected().getProperty('value');
	},

	setValue: function(values) {
		this.$.selectedIndex = -1;
		return Base.each(values.length != null ? values : [values], function(val) {
			val = DomElement.unwrap(val);
			this.getElements('option[value="' + (val.value || val) + '"]').setProperty('selected', true);
		}, this);
	}
});

// Name it SelectOption instead of Option, as Option is the native prototype.
SelectOption = FormElement.extend({
	_tag: 'option',
	_properties: ['text', 'value', 'selected', 'defaultSelected', 'index']
});

#endif // __browser_html_Form__	
