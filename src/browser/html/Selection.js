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
		var range = this.getSelection(), current = this.getValue();
		// Fix Firefox scroll bug, see http://userscripts.org/scripts/review/9452
		var top = this.$.scrollTop, height = this.$.scrollHeight;
		this.setValue(current.substring(0, range.start) + value + current.substring(range.end, current.length));
		if(top != null)
			this.$.scrollTop = top + this.$.scrollHeight - height;
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
