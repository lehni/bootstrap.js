#ifndef __browser_html_Form__
#define __browser_html_Form__

#include "HtmlElement.js"

////////////////////////////////////////////////////////////////////////////////
// HtmlForm

// HtmlForm related functions, but available in all elements:

HtmlElement.inject({
	BEANS_TRUE

	getFormElements: function() {
		return this.getElements(['input', 'select', 'textarea']);
	},

	getValue: function(name) {
		var el = this.getElement(name);
		return el && el.getValue && el.getValue();
	},

	setValue: function(name, val) {
		var el = this.getElement(name);
		// On Safari, using injectBottom here causes problems with transmission of
		// some of the form values sometimes. Injecting at the top seems to solve
		// this.
		if (!el) el = this.injectTop('input', { type: 'hidden', id: name, name: name });
		return el.setValue(val);
	},

	getValues: function() {
		return this.getFormElements().each(function(el) {
			var name = el.getName(), value = el.getValue();
			if (name && value !== undefined && !el.getDisabled())
				this[name] = value;
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

HtmlForm = HtmlElement.extend({
	BEANS_TRUE
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

HtmlFormElement = HtmlElement.extend({
	BEANS_TRUE
	_properties: ['name', 'disabled'],
	_methods: ['focus', 'blur'],

	enable: function(enable) {
		var disabled = !enable && enable !== undefined;
		if (disabled) this.$.blur();
		this.$.disabled = disabled;
		return this;
	}
});

HtmlInput = HtmlFormElement.extend({
	BEANS_TRUE
	_tag: 'input',
	_properties: ['type', 'checked', 'defaultChecked', 'readOnly', 'maxLength'],
	_methods: ['click'],

	getValue: function() {
		if (this.$.checked && /^(checkbox|radio)$/.test(this.$.type) ||
			/^(hidden|text|password|button|search)$/.test(this.$.type))
			return this.$.value;
	},

	// TODO: Decide if setValue for checkboxes / radios should actually change
	// the value or set checked if the values match! Maybe a new function is
	// needed that does that, e.g. set / getCurrent
	setValue: function(val) {
		if (/^(checkbox|radio)$/.test(this.$.type)) this.$.checked = this.$.value == val;
		// Fix IE bug where string values set to null appear as 'null' instead of ''
		else this.$.value = val != null ? val : '';
		return this;
	}
});

HtmlTextArea = HtmlFormElement.extend({
	BEANS_TRUE
	_tag: 'textarea',
	_properties: ['value']
});

HtmlSelect = HtmlFormElement.extend({
	BEANS_TRUE
	_tag: 'select',
	_properties: ['type', 'selectedIndex'],

	getOptions: function() {
		return this.getElements('option');
	},

	getSelected: function() {
		return this.getElements('option[selected]');
	},

	setSelected: function(values) {
		this.$.selectedIndex = -1;
		if (values) {
			Array.each(values.length != null ? values : [values], function(val) {
				val = DomElement.unwrap(val);
				if (val != null)
					this.getElements('option[value="' + (val.value || val) + '"]').setProperty('selected', true);
			}, this);
		}
		return this;
	},

	getValue: function() {
		return this.getSelected().getProperty('value');
	},

	setValue: function(values) {
		return this.setSelected(values);
	}
});

HtmlOption = HtmlFormElement.extend({
	BEANS_TRUE
	_tag: 'option',
	_properties: ['text', 'value', 'selected', 'defaultSelected', 'index']
});

#endif // __browser_html_Form__	
