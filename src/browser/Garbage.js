#ifndef __browser_Garbage__
#define __browser_Garbage__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif

////////////////////////////////////////////////////////////////////////////////
// Garbage Collection

// Garbage.collect can be used for any object that needs to be collected in
// the end. If dispose() is defined, it is called, for manaual cleanup.

Garbage = (function() {
	var objects = [];

	// Add the unload handler which walks through objects and cleans each of
	// them:
	window.addEvent('unload', function() {
		objects.each(function(obj) {
			if (obj.dispose) obj.dispose();
			if ($typeof(obj) == 'element') {
				for (var n in Element.prototype)
					obj[n] = null;
			} else { // normal object
				for (var n in obj)
					delete obj[n];
			}
		});
	});

	return {
		/**
		 * Collects all passed parameters as objects to be cleaned when
		 * the browser window is unloaded.
		 * This is the only method exposed to the outside.
		 */
		collect: function() {
			objects.append(arguments);
		}
	}
})();

#endif // __browser_Garbage__