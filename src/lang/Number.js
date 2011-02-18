//#ifndef __lang_Number__
//#define __lang_Number__

////////////////////////////////////////////////////////////////////////////////
// Number

Number.inject({
	// tell Base.type that number objects are numbers too.
	_type: 'number',

	limit: function(min, max) {
		return Math.min(max, Math.max(min, this));
	},

	times: function(func, bind) {
		for (var i = 0; i < this; i++)
			func.call(bind, i);
		return bind || this;
	},

	toInt: function(base) {
		return parseInt(this, base || 10);
	},

	toFloat: function() {
		return parseFloat(this);
	},

	toPaddedString: function(length, base, prefix) {
		var str = this.toString(base || 10);
		return (prefix || '0').times(length - str.length) + str;
	}
});

//#endif // __lang_Number__