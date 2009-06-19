#ifndef __lang_Date__
#define __lang_Date__

////////////////////////////////////////////////////////////////////////////////
// Date

Date.inject({
#ifndef RHINO // TODO: Consider BROWSER_LEGACY at a later point
	statics: {
		now: Date.now || function() {
			return +new Date();
		}
	}
#endif // !RHINO
});

#endif // __lang_Date__
