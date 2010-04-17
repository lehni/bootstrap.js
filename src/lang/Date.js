#ifndef __lang_Date__
#define __lang_Date__

////////////////////////////////////////////////////////////////////////////////
// Date

Date.inject({
	statics: {
		SECOND: 1000,
		MINUTE: 60000,
		HOUR: 3600000,
		DAY: 86400000,
		WEEK: 604800000, // 7 * DAY
		MONTH: 2592000000, // 30 * DAY
		YEAR: 31536000000, // 365 * DAY

#ifndef RHINO // TODO: Consider BROWSER_LEGACY at a later point
		now: Date.now || function() {
			return +new Date();
		}
#endif // !RHINO
	}
});

#endif // __lang_Date__
