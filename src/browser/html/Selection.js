#ifndef __browser_html_Selection__
#define __browser_html_Selection__

#include "Form.js"

////////////////////////////////////////////////////////////////////////////////
// Selection

FormElement.inject({
	setSelection: function(start, end) {
		var sel = end == undefined ? start : { start: start, end: end };
		this.focus();
		if(Browser.IE) {
			var range = this.$.createTextRange();
			range.collapse(true);
			range.moveStart('character', sel.start);
			range.moveEnd('character', sel.end - sel.start);
			range.select();
		} else this.$.setSelectionRange(sel.start, sel.end);
		return this;
	},
 
	getSelection: function() {
		if(Browser.IE) {
			this.focus();
			var range = document.selection.createRange();
			var tmp = range.duplicate();
			tmp.moveToElementText(this.$);
			tmp.setEndPoint('EndToEnd', range);
			return { start: tmp.text.length - range.text.length, end: tmp.text.length };
		}
		return { start: this.$.selectionStart, end: this.$.selectionEnd };
	},
 
	getSelectedText: function() {
/* needed? the other should allways produce the right result.
		if(Browser.IE)
			return document.selection.createRange().text;
*/
 		var range = this.getSelection();
		return this.getValue().substring(range.start, range.end);
	},

	replaceSelectedText: function(value, select) {
		var range = this.getSelection(), curr = this.getValue();
		this.setValue(curr.substring(0, range.start) + value + curr.substring(range.end, curr.length));
		return select || select == undefined
			? this.setSelection(range.start, range.start + value.length)
			: this.setCaretPosition(range.start + value.length);
	},

	getCaretPosition: function() {
		return this.getSelection().start;
	},
 
	setCaretPosition: function(pos) {
		if(pos == -1)
			pos = this.getValue().length;
		return this.setSelection(pos, pos);
	}
});

#endif // __browser_html_Selection__
