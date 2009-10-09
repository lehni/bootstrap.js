#ifndef __browser_html_Selection__
#define __browser_html_Selection__

#include "Form.js"

////////////////////////////////////////////////////////////////////////////////
// Selection

FormElement.inject({
	setSelection: function(start, end) {
		var sel = end == undefined ? start : { start: start, end: end };
		this.focus();
		if(this.$.setSelectionRange) {
			this.$.setSelectionRange(sel.start, sel.end);
		} else {
			var value = this.getValue();
			var len = value.substring(sel.start, sel.end).replace(/\r/g, '').length;
			var pos = value.substring(0, sel.start).replace(/\r/g, '').length;
			var range = this.$.createTextRange();
			range.collapse(true);
			range.moveEnd('character', pos + len);
			range.moveStart('character', pos);
			range.select();
		}
		return this;
	},

	getSelection: function() {
		if (this.$.selectionStart !== undefined) {
			return { start: this.$.selectionStart, end: this.$.selectionEnd };
		} else {
			this.focus();
			var pos = { start: 0, end: 0 };
			var range = this.getDocument().$.selection.createRange();
			var dup = range.duplicate();
			if (this.$.type == 'text') {
				pos.start = 0 - dup.moveStart('character', -100000);
				pos.end = pos.start + range.text.length;
			} else {
				var value = this.getValue();
				var offset = value.length - value.match(/[\n\r]*$/)[0].length;
				dup.moveToElementText(this.$);
				dup.setEndPoint('StartToEnd', range);
				pos.end = offset - dup.text.length;
				dup.setEndPoint('StartToStart', range);
				pos.start = offset - dup.text.length;
			}
			return pos;
		}
	},

	getSelectedText: function() {
 		var range = this.getSelection();
		return this.getValue().substring(range.start, range.end);
	},

	replaceSelectedText: function(value, select) {
		var range = this.getSelection(), current = this.getValue();
		// Fix Firefox scroll bug, see http://userscripts.org/scripts/review/9452, #insertAtCaret()
		var top = this.$.scrollTop, height = this.$.scrollHeight;
		this.setValue(current.substring(0, range.start) + value + current.substring(range.end, current.length));
		if(top != null)
			this.$.scrollTop = top + this.$.scrollHeight - height;
		return select || select == undefined
			? this.setSelection(range.start, range.start + value.length)
			: this.setCaret(range.start + value.length);
	},

	getCaret: function() {
		return this.getSelection().start;
	},

	setCaret: function(pos) {
		return this.setSelection(pos, pos);
	}
});

#endif // __browser_html_Selection__
