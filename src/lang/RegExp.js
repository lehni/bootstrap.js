#ifndef __lang_RegExp__
#define __lang_RegExp__

////////////////////////////////////////////////////////////////////////////////
// RegExp

RegExp.inject({
	// Tell Base.type what to return for regexps.
	_type: 'regexp'
});

#ifdef BROWSER_LEGACY

////////////////////////////////////////////////////////////////////////////////
// RegExp Legacy

// RegExp do not define global an exec does not work properly on IE 5

if (!/ /g.global) {
	RegExp.inject({
		exec: function(str) {
			if (this.global == undefined) {
				this.global = /\/[^\/]*g[^\/]*$/.test(this);
				this.multiline = /\/[^\/]*m[^\/]*$/.test(this);
				this.ignoreCase = /\/[^\/]*i[^\/]*$/.test(this);
			    this.lastIndex = 0;
			}
			var last = this.lastIndex, res = this.base(str.substring(last));
			if (!res) {
			    this.lastIndex = 0;
			    return res;
			}
			this.lastIndex = RegExp.lastIndex + last;
			res.index = this.lastIndex - res[0].length;
			if (!last) RegExp._input = str;
			res.input = RegExp._input;
			return res;
		}
	});	
}

#endif // BROWSER_LEGACY

#endif // __lang_RegExp__