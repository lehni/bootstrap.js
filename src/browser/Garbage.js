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
		objects.push(window, document);
		for (var i = 0; i < objects.length; i++) {
			var obj = objects[i];
			if (obj.dispose) obj.dispose();
			if (obj._type == 'element') { // Element
				// Clear functions added for certain tags
				if (obj.data)
					for (var p in obj.data.tags) obj[p] = null;
				// Clear data
				obj.data = null;
				// Clear element functions
				for (var p in Element.prototype) obj[p] = null;
			} else { // Normal object
				for (var p in obj) delete obj[p];
			}
		}
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