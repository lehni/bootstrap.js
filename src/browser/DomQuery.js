#ifndef __browser_Element_DomQuery__
#define __browser_Element_DomQuery__

#ifdef HIDDEN
/**
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
#endif

////////////////////////////////////////////////////////////////////////////////
// Element DomQuery

Element.inject(function() {
	var cache = {}, unique = 0;

	function query(selectors, root, filter, unique, max) {
		root = root ? Element.unwrap(root) : document;
		// TODO: if root is a string, select it first!
		var res = new Elements(), els = filter;
		// selectors can be an array or a coma separated string.
		// If it is an array, it can contain elements and selector strings.
		// The elements are wrapped and added.
		(typeof selectors == 'string' ? selectors.split(',') : selectors).each(function(selector) {
			if (!filter) els = null; // Restart collecting for each selector
			if (!filter && typeof selector != 'string') {
				// Probably a element. Just try to add it.
				res.push(Element.get(selector));
			} else {
				selector.clean().split(' ').each(function(part) {
					// Cache selector parsing results:
					var param;
					if (cache[part]) param = cache[part].param;
					else {
						// Mac IE does not support (?:), so live without it here:
						// Allow * in classnames, as a wildcard which is later replaced by .*
						//                  1         3           4               6      8             9
						//                  tag       id          class           a.name attr.operator attr.value
						param = part.match(/^(\w*|\*)(#([\w_-]+)|\.([\*\w_-]+))?(\[(\w+)(([!*^$]?=)["']?([^"'\]]*)["']?)?\])?$/);
						if (param) param[1] = param[1] || '*';
						cache[part] = { param: param };
					}
					if (!param) return; // continue
					var tag = param[1], id = param[3];
					if (!els) { // Fill in els accordingly
						if (id) {
							var el = document.getElementById(id);
							if (!el || !Element.isAncestor(el, root) || tag != '*'
								&& el.tagName.toLowerCase() != tag) throw $break;
							els = [el];
						} else {
							els = $A(root.getElementsByTagName(tag));
						}
					} else { // Filter
						els = els.each(function(el) {
							this.append(el.getElementsByTagName(tag))
						}, []);
						if (id) els = els.filter(function(el) {
							return el.id == id;
						});
					}
					if (param[4]) {
						// Find classname separated by whitespace.
						var test = ' ' + param[4] + ' ';
						els = els.filter(function(el) {
							return (' ' + el.className + ' ').indexOf(test) != -1;
						});
					}
					if (param[6]) {
						var name = param[6], value = param[9], operator = Element.operators[param[8]];
						els = els.filter(function(el) {
							var att = el.getProperty(name);
							if (att) return !operator || operator(att, value);
						});
					}
				});
				if (els) els.each(function(el) {
					el = Element.get(el);
					if (!unique) res.push(el);
					else if (el._unique != unique) {
						res.push(el);
						el._unique = unique;
						if (max && res.length >= max) throw $break;
					}
				});
			}
			if (max && res.length >= max) throw $break;
		});
		return res;
	}

	return {
		$static: {
			select: function(selectors, root, max) {
				return query(selectors, root, null, ++unique, max);
	  		},

			filter: function(els, selectors, root) {
				return query(selectors, root, els);
	  		},

	        operators : {
	            '=': function(a, v) {
		            return a == v;
		        },
		        '!=': function(a, v) {
		            return a != v;
		        },
		        '^=': function(a, v) {
		            return a.substr(0, v.length) == v;
		        },
		        '$=': function(a, v) {
		            return a.substr(a.length - v.length) == v;
		        },
		        '*=': function(a, v) {
		            return a.indexOf(v) !== -1;
		        },
		        '%=': function(a, v) {
		            return (a % v) == 0;
	            }
	        }
		}
	}
});

// Short-cut to Element.select
$$ = Element.select;

#endif // __browser_Element_DomQuery__
