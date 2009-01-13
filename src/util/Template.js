/**
 * JavaScript Template Engine
 * (c) 2005 - 2008, Juerg Lehni, http://www.scratchdisk.com
 *
 * Template.js is released under the MIT license
 * http://dev.helma.org/Wiki/JavaScript+Template+Engine/
 * http://bootstrap-js.net/ 
 */

/**
 * IMPORTANT:
 *
 * Template.js is designed to be mostly independent of Bootstrap.js,
 * but uses two of its functions: trim() and capitalize() from String.prototype.
 * These are present in other frameworks as well. If not, they need to be
 * added manually, or Template.js need to be changed.
 */

#ifdef HELMA

// Define global encodeHtml and encodeAll, used for encoding
if (!global.encodeHtml)
	encodeHtml = format;
if (!global.encodeAll)
	encodeAll = encode;

#else // !HELMA

// Retrieve a reference to the global scope.
global = this;

// Define TemplateWriter that mimics Helma's ResponseTrans
function TemplateWriter() {
	this.buffers = [];
	this.current = [];
}

TemplateWriter.prototype = {
	write: function(what) {
		if (what != null)
			this.current.push(what);
	},

	push: function() {
		this.buffers.push(this.current);
		this.current = [];
	},

	pop: function() {
		var res = this.current.join('');
		this.current = this.buffers.pop();
		return res;
	}
}

#endif // !HELMA

/**
 * Constructor
 *
 * @object a file to read the template from, or an object to retrieve a
 * template with the given name from
 * @name the name of the resource in the object
 */
function Template(object, name, parent) {
	if (object) {
#ifdef RHINO
#ifdef HELMA
		if (object instanceof File)
			object = new java.io.File(object.getPath());
		if (object instanceof java.io.File) {
			if (!object.exists())
				throw 'Cannot find template ' + object;
			// it's a file, so create the resource directly here:
			this.resource = new Packages.helma.framework.repository.FileResource(object);
			this.resourceName = this.resource.getShortName();
			this.pathName = this.resource.getName();
#else // !HELMA
		if (object instanceof java.io.File) {
			// Add getInputStream to java.io.File object.
			object.getInputStream = function() {
				return new java.io.FileInputStream(this);
			}
			this.resource = object;
			this.resourceName = object.getName();
			this.pathName = object.getPath();
#endif // !HELMA
		} else if (typeof object == 'string') {
			this.content = object;
			this.resourceName = name ? name : 'string';
			this.pathName = this.resourceName;
#ifdef HELMA
		} else {
			this.resourceContainer = object;
			this.resourceName = name + '.jstl';
			this.findResource();
#endif // HELMA
		}
#else // !RHINO
		this.content = object;
		this.resourceName = name ? name : 'string';
		this.pathName = this.resourceName;
#endif // !RHINO
		if (parent) {
			parent.subTemplates[name] = this;
			this.parent = parent;
		}
		// Counter for macro param variables.
		this.macroParam = 0;
		this.compile();
	}
}

Template.prototype = {
	render: function(object, param, out) {
		try {
			var parentParam = param && param.__param__;
			// Inherit from param.__param__ if it is set:
			if (parentParam) {
#ifdef RHINO
				// Convert to native JS since apparently we cannot inherit from java objects
				if (parentParam instanceof java.util.Map) {
					var prm = {};
					for (var i in parentParam)
						prm[i] = parentParam[i];
					parentParam = param.__param__ = prm;
				}
#endif // RHINO
				function inherit() {};
				inherit.prototype = parentParam;
				var prm = new inherit();
				// And copy over from param:
				for (var i in param)
					prm[i] = param[i];
				param = prm;
			}
			// If out is null, render to a string and return it
			var asString = !out;
#ifdef HELMA
			if (asString) (out = res).push();
#else // !HELMA
			if (asString) (out = new TemplateWriter()).push();
#endif // !HELMA
			this.__render__.call(object, param, this, out);
			if (asString) return out.pop();
		} catch (e) {
			// In case the exception happened in a finished template,
			// output the error for the template
			if (typeof e != 'string') {
				this.throwError(e);
			} else {
				// Just throw it, for debugging of renderTemplate
				throw e;
			}
		}
	},

	/**
	 * Returns the sub template, if it exists. The name is specified without
	 * the trailing #
	 */
	getSubTemplate: function(name) {
		return this.subTemplates[name];
	},

	/**
	 * Renders the sub template on object. The name is specified without
	 * the trailing #
	 */
	renderSubTemplate: function(object, name, param, out) {
		var template = this.subTemplates[name];
		if (!template) throw 'Unknown sub template: ' + name;
		return template.render(object, param, out);
	},

	/**
	 * Parses the passed template lines and returns the JS code
	 * for the render function
	 */
	parse: function(lines) {
		this.tags = []; // Keep track of tags at any given code line (= array index)
		this.listId = 0; // An id for generated list names
		// Walk through the lines and keep track of tags and the text between them
		// this supports multiline tags, such as <% ...>...\n...</%>
		// the finding of closing tags counts nested tags, to make sub templates
		// work
		var skipLineBreak = false;
		var skipWhiteSpace = false;
		var tagCounter = 0;
		var templateTag = null;
		// Stack for control tags and loops
		var stack = { control: [], loop: {} };
		// String buffer, joined with '' to retrieve the concatenated string
		var buffer = [];
		// Container for the generated code lines.
		var code = [ 'this.__render__ = function(param, template, out) {' ];
#ifdef RHINO
		var lineBreak = java.lang.System.getProperty('line.separator');
#else // !RHINO
		var lineBreak = '\n';
#endif // !RHINO
		// Append strings in buffer either to templateTag or to code, depending
		// on the mode we're in.
		function append() {
			if (buffer.length) {
				// Write out text lines
				var part = buffer.join('');
				// Filter out white space before real content if the <%-%> tag told us to do so:
				if (part && skipWhiteSpace) {
					part = part.match(/\s*([\u0000-\uffff]*)/);
					if (part)
						part = part[1];
					skipWhiteSpace = false;
				}
				if (part) {
					if (templateTag)
						templateTag.buffer.push(part);
					else // Encodes by escaping ",',\n,\r
#ifdef RHINO
						code.push('out.write(' + uneval(part) + ');');
#else // !RHINO
						// Do not rely on uneval on the client side, although it's 
						// there on some browsers...
						// Unfortunatelly, part.replace(/["'\n\r]/mg, "\\$&") does
						// not work on Safari. TODO: Report bug:
						code.push('out.write("' + part.replace(/(["'\n\r])/mg, '\\$1') + '");');
#endif // !RHINO
				}
				buffer.length = 0;
			}
		}
		try {
			for (var i = 0; i < lines.length; i++) {
				var line = lines[i];
				var start = 0, end = 0;
				while (true) {
					// Search start and end of macro tag, keep lines:
					if (tagCounter == 0) {
						start = line.indexOf('<%', end);
						if (start != -1) { // Found the begining of a macro
							if (start > end) // There was some text before it
								buffer.push(line.substring(end, start));
							// Skip <, the % is skiped bellow in line.indexOf('%', end + 1);
							end = start + 1;
							tagCounter++;
							append();
							// Now buffer collects tag lines
						} else {
							if (skipLineBreak)
								skipLineBreak = false;
							else
								buffer.push(line.substring(end), lineBreak);
							break;
						}
					} else {
						while (tagCounter != 0) {
							end = line.indexOf('%', end + 1); // skip %
							if (end == -1) break;
							if (line[end - 1] == '<') tagCounter++;
							if (line[end + 1] == '>') tagCounter--;
						}
						if (end != -1) { // Found the end of the macro
							end += 2; // Include tag end as well
							buffer.push(line.substring(start, end));
							// Parse it:
							var tag = buffer.join('');
							// Keep track of line numbers. this.tags links code line numbers
							// to template line numbers
							this.tags[code.length] = { lineNumber: i, content: tag };
							// If this is a template tag, change the state to
							// finding the end of the template. Do a thourough check
							// as this tag might also be the setting of a variable
							// or the call of a mcro on a scope variable.
							if (/^<%\s*[#$][\w_]+\s*[+-]?%>$/.test(tag)) {
								if (templateTag)
									this.parseTemplateTag(templateTag, code);
								templateTag = { tag: tag, buffer: [] };
							} else {
								// See if it's a special <%-%> tag that tells us to skip
								// all the white space until the next content
								if (templateTag)
									templateTag.buffer.push(tag);
								else if (tag == '<%-%>')
									skipWhiteSpace = true;
								else if (this.parseMacro(tag, code, stack, true) && end == line.length)
									skipLineBreak = true;
							}
							// Now buffer collects lines between tags
							buffer.length = 0;
						} else {
							buffer.push(line.substring(start), lineBreak);
							break;
						}
					}
				}
			}
			if (tagCounter) { // Report the tag that was left open
				throw 'Tag is not closed';
			} else if (stack.control.length) {
				// Resize code back to the error, so throwError() picks
				// the right line in the catch block bellow.
				code.length = stack.control.pop().lineNumber;
				throw 'Control tag is not closed';
			} else {
				// Write out the rest
				append();
				if (templateTag)
					this.parseTemplateTag(templateTag, code);
			}
			// Render the sub templates that were defined with $ into variables.
			for (var i = 0; i < this.renderTemplates.length; i++) {
				var template = this.renderTemplates[i];
				// Trim at render-time, if required:
				code.splice(1, 0, 'var $' + template.name + ' = template.renderSubTemplate(this, "' +
					template.name + '", param)' + (template.trim ? '.trim()' : ''));
				// Shift tags as well, so line numbers are still right
				this.tags.unshift(null);
			}
			code.push('}');
			return code.join(lineBreak);
		} catch (e) {
			this.throwError(e, code.length);
		}
	},

	/**
	 * Parses the different parts of the macro and returns a datastructure
	 * that then can be used to produce the macro code.
	 */
	parseMacroParts: function(tag, code, stack, allowControls) {
		var match = tag.match(/^<%(=?)\s*([\u0000-\uffff]*?)\s*(-?)%>$/);
		if (!match)	return null;
		// If the tag ends with -%>, the line break after it should be swallowed,
		// if there is any. By default all control macros swallow line breaks.
		var isEqualTag = match[1] == '=', content = match[2], swallow = !!match[3];

		var start = 0, pos = 0, end;

		function getPart() {
			if (pos > start) {
				var prev = start;
				start = pos;
				return content.substring(prev, pos);
			}
		}

		function nextPart() {
			while (pos < content.length) {
				var ch = content[pos];
				if (/\s/.test(ch)) {
					var ret = getPart();
					if (ret) return ret;
					// Find end of white space using regexp
					var nonWhite = /\S/g;
					nonWhite.lastIndex = pos + 1;
					pos = (end = nonWhite.exec(content)) ? end.index : content.length;
					start = pos;
					continue;
				} else if ((ch == '=' || ch == '|') && content[pos + 1] != ch) {  // Named parameter / filter
					// The check above discovers || as a logical parameter and does not 
					// count the first | as a single item.
					// Named parameters and start of filters can be handled the same
					// as the sign itself is included, and nothing else needs to be done
					// = is included as a clue that this is going to be a named param.
					pos++;
					return getPart();
				} else if (/["'([{<]/.test(ch)) { // Groups: "" '' () [] {} <%%>
					if (ch == '<') {
						// cheat a little bit to also include <% %>, which is more
						// than one char
						if (content[pos + 1] == '%') ch = '<%';
						else ch = null;
					}
					if (ch) {
						// find the end, using regexps. 
						var close = ({ '(': ')', '[': ']', '{': '}', '<%': '%>' })[ch], open = null;
						var search = ({ '(': /[()]/g, '[': /[\[\]]/g, '{': /[{}]/g,
								'<%': /<%|%>/g, '"': /"/g, "'": /'/g })[ch];
						// " and ' cannot be nested:
						if (!close) close = ch;
						else open = ch;
						var count = 1; // count the opening char already
						search.lastIndex = pos + 1;
						while (count && (end = search.exec(content))) {
							// skip escaped chars:
							if (content[end.index - 1] == '\\') continue;
							if (end == close) count--;
							else if (end == open) count++;
						}
						if (end) pos = end.index + close.length;
						else pos = content.length;
						return getPart();
					}
				} 
				// skip to the the next interesting position:
				var next = /[\s=|"'([{<]/g;
				next.lastIndex = pos + 1;
				pos = (end = next.exec(content)) ? end.index : content.length;
			}
			// the last bit
			if (pos == content.length) {
				var ret = getPart();
				pos++;
				return ret;
			}
		}

#ifdef HELMA
		function parseParam(param) {
			// Support for old-style data access in Helma
			var data = param.match(/^(param|response|request|session|properties)\.(.*)$/);
			if (data) {
				// Allow lookup to session.user, everything else goes to session.data
				if (!/^session\.user\b/.test(data)) {
					// Use  arrays of strings for each pseudo parameter. The name
					// will be inserted at position 1 and the result will be joined.
					// This allows both getProperty('name') and session.data.name
					var buf = {
						response: ['res.data.'], request: ['req.data.'], 
						session: ['session.data.'], param: ['param.'],
						properties: ['getProperty("', '")']
					}[data[1]];
					// Now insert the name at position 1
					buf.splice(1, 0, data[2]);
					return buf.join('');
				}
			}
			return param;
		}
#endif // HELMA

		// TODO: macro is not the right name here, as it is also filters: functional units between |...
		var macros = [], macro = null, isMain = true;

		function nextMacro(next) {
			if (macro) {
				if (!macro.command)
					throw 'Syntax error';
				macro.opcode = macro.opcode.join(' ');
				if (macro.isControl) {
					// Strip away ()
					if (macro.opcode[0] == '(') macro.opcode = macro.opcode.substring(1, macro.opcode.length - 1);
				} else {
					// Finish previous macro and push it onto list
					// convert param and unnamed to a arguments array that can directly be used
					// when calling the macro. param comes first, unnamed after.
					var unnamed = macro.unnamed.join(', ');
					macro.arguments = '[ { ' + macro.param.join(', ') + ' } ' + (unnamed ? ', ' + unnamed : '') + ' ]';
					// Split object and property / macro name
					var match = macro.command.match(/^(.*)\.(.*)$/);
					if (match) {
						macro.object = match[1];
						macro.name = match[2];
					} else { // If no object name is given, we're in global
						macro.object = 'global';
						macro.name = macro.command;
					}
				}
				macros.push(macro);
				isMain = false;
			}
			if (next) {
				macro = {
					command: next, opcode: [], param: [], unnamed: [],
					// Values needed on code rendering time
					values: { prefix: null, suffix: null, 'default': null, encoding: null, separator: null, 'if': null }
				};
				// Control and data macros are only allowed for first macro in chain (main)
				if (isMain) {
					// Is this a control macro?
					macro.isControl = allowControls && /^(foreach|if|elseif|else|end)$/.test(next);
					// Is this a data macro?
#ifdef HELMA
					var param = parseParam(macro.command);
					// Tell the parseMacro code to simply output the value
					// If parseParam produces a result different from macro.command,
					// we are using a pseudo parameter which is data as well:
					macro.isData = isEqualTag || param != macro.command;
					macro.command = param;
#else // !HELMA
					macro.isData = isEqualTag;
#endif // !HELMA
					macro.isSetter = next[0] == '$'; 
				}
			}
		}

		function nestedMacro(that, value, code, stack) {
			if (/<%/.test(value)) {
				var nested = value;
				value = 'param_' + (this.macroParam++);
				if (/^<%/.test(nested)) {
					// A nested macro: render it, then set the result to a variable
					code.push('var ' + value + ' = ' + that.parseMacro(nested, code, stack, false, true) + ';');
				} else if (/^['"]/.test(nested)) {
					// TODO: Check if this is dangerous? Not more than the rest probably, right?
					// Since nested is in encoded form, eval it so we get its value.
					eval('nested = ' + nested);
					new Template(nested, value, that);
					code.push('var ' + value + ' = template.renderSubTemplate(this, "' + value + '", param);');
				} else {
					throw 'Syntax error: ' + nested;
				}
			}
#ifdef HELMA
			return parseParam(value);
#else // !HELMA
			return value;
#endif // !HELMA
		}

		// Now do the main parsing of the parts
		var part, isFirst = true, append;
		while (part = nextPart()) {
			if (isFirst) {
				nextMacro(part); // add new macro
				isFirst = false;
				// Appending is allowed as long as no named or unnamed parameter
				// is specified.
				append = true;
			} else if (/\w=$/.test(part)) { // Named param, but not double ==
				// TODO: Calling nextPart here should only return values, nothing else!
				// add error handling...
				var key = part.substring(0, part.length - 1), value = nextPart();
				value = nestedMacro(this, value, code, stack);
				macro.param.push('"' + key + '": ' + value);
				// Override defaults only:
				if (macro.values[key] !== undefined)
					macro.values[key] = value;
				// Appending to macro command not allowed after first parameter
				append = false;
			} else if (part == '|') { // start a filter
				isFirst = true;
			} else { // unnamed param
				// Detect setters. isSetter is turned on first for any tag starting
				// with '<% $'. Since this might also be a template var setter,
				// detect variable setter here by checking the first part for '='.
				if (macro.isSetter && !macro.opcode.length && part[0] != '=')
					macro.isSetter = false;
				// Unnamed parameters are not allowed in <%= tags, in control tags
				// or when setting variables.
				if (!macro.isData && !macro.isControl && !macro.isSetter) {
					part = nestedMacro(this, part, code, stack);
					macro.unnamed.push(part);
					// Appending to macro opcode not allowed after first parameter
					append = false;
				} else if (append) { // Appending to the opcode...
					if (macro.isSetter) // Add support of nested macros in setters too
						part = nestedMacro(this, part, code, stack);
					macro.opcode.push(part);
				} else {
					throw "Syntax error: '" + part + "'";
				}
			}
		}
		// Add last macro
		nextMacro();

		// Retrieve first macro
		macro = macros.shift();
		// Convert other macros to filter strings:
		for (var i = 0; i < macros.length; i++) {
			var m = macros[i];
			macros[i] = '{ command: "' + m.command + '", name: "' + m.name +
				'", object: ' + m.object + ', arguments: ' + m.arguments + ' }';
		}
		var values = macro.values, encoding = values.encoding;
		values.filters = macros.length > 0 ? '[ ' + macros.join(', ') + ' ]' : null;
		if (encoding) {
			// Convert encoding to encoder function:
			// TODO: capitalize() is defined in Bootstrap!
			values.encoder = 'encode' + encoding.substring(1, encoding.length - 1).capitalize();
			// If default is, encode it now if it is a string literal, create the encoding call otherwise.
			var def = values['default'];
			if (def)
				values['default'] = /^'"/.test(def) ? '"' + global[values.encoder](def.substring(1, def.length - 1)) + '"'
					: values.encoder + '(' + def + ')';
		}
		// All control macros swallow line breaks:
		macro.swallow = swallow || macro.isControl;
		macro.tag = tag;
		return macro;
	},

	/**
	 * Parses the tag and reports possible syntax errors.
	 * This is the core of the template parser
	 */
	parseMacro: function(tag, code, stack, allowControls, toString) {
		// Only process if it is not a comment.
		// Return true to tell parse() to swallow the following line break.
		if (/^<%--/.test(tag))
			return true;
		// <%= tags cannot have unnamed parameters
		var macro = this.parseMacroParts(tag, code, stack, allowControls);
		if (!macro)
			throw 'Invalid tag';
		var values = macro.values, result;
		// Put it all into a conditional block if the 'if' param is defined:
		var condition = values['if'];
		if (condition)
			code.push(								'if (' + condition + ') {');
		var postProcess = !!(values.prefix || values.suffix || values.filters);
		var codeIndexBefore = code.length;
		if (macro.isData) { // param, response, request, session, or a <%= %> tag
			result = this.parseLoopVariables(macro.opcode
				? macro.command + ' ' + macro.opcode : macro.command, stack);
		} else if (macro.isControl) {
			var open = false, close = false;
			var prevControl = stack.control[stack.control.length - 1];
			// Only allow else with and if beforehand
			if (/^else/.test(macro.command) && (!prevControl || !/if$/.test(prevControl.macro.command))) {
				throw "Syntax error: 'else' requiers 'if' or 'elseif'";
			} else {
				switch (macro.command) {
				case 'foreach':
					var match = macro.opcode.match(/^\s*(\$[\w_]+)\s*in\s*(.+)$/);
					if (!match) throw 'Syntax error';
					open = true;
					var variable = match[1], value = match[2];
					// separator means post processing too:
					postProcess = postProcess || !!values.separator;
					var suffix = '_' + (this.listId++);
					var list = 'list' + suffix, length = 'length' + suffix;
					var index = 'i' + suffix, first = 'first' + suffix;
					// Use stacks per variable name, in case two loops use the same variable name
					var loopStack = stack.loop[variable] = stack.loop[variable] || [];
					loopStack.push({ list: list, index: index, length: length, first: first });
					// Store variable in macro, so it can be retrieved from
					// the control stack in 'end'.
					macro.variable = variable;
					code.push(						'var ' + list + ' = ' + value + '; ',
													'if (' + list + ') {',
#ifdef HELMA
						// The check for HopObject is only necessary if it's a
						// variable reference and not an explicit string / array / etc.
						!(/^["'[]/.test(value))	?	'	if (' + list + ' instanceof HopObject) ' + list + ' = ' + list + '.list();' : null,
#endif // HELMA
						// TODO: finish toList support!
						// Problem: There is currently no easy way to retrieve the key for values...
						// Possibilities: Store pairs as { key: , value: } in toList...
													'	if (' + list + '.length == undefined) ' + list + ' = template.toList(' + list + ');',
													'	var ' + length + ' = ' + list + '.length' + (values.separator ? ', ' + first + ' = true' : '') + ';',
													'	for (var ' + index + ' = 0; ' + index + ' < ' + length + '; ' + index + '++) {',
													'		var ' + variable + ' = ' + list + '[' + index + '];',
						values.separator		?	'		out.push();' : null);
					break;
				case 'end':
					if (macro.opcode) throw 'Syntax error';
					if (!prevControl || !/^else|^if$|^foreach$/.test(prevControl.macro.command))
						throw "Syntax error: 'end' requiers 'if', 'else', 'elseif' or 'foreach'";
					close = true;
					if (prevControl.macro.command == 'foreach') {
						// Pop the current loop from the stack.
						var loop = stack.loop[prevControl.macro.variable].pop();
						// If the loop defines a separator, process it now.
						// The first part of this (out.push()) happen in 'foreach'
						var separator = prevControl.postProcess && prevControl.postProcess.separator;
						if (separator)
							code.push(				'		var val = out.pop();',
													'		if (val != null && val !== "") {',
													'			if (' + loop.first + ') ' + loop.first + ' = false;',
													'			else out.write(' + separator + ');',
													'			out.write(val);',
													'		}');
						code.push(					'	}');
					}
					code.push(						'}');
					break;
				case 'elseif':
					close = true;
					// More in 'if' (no break here)
				case 'if':
					if (!macro.opcode) throw 'Syntax error';
					open = true;
					code.push(						(close ? '} else if (' : 'if (') + this.parseLoopVariables(macro.opcode, stack) + ') {');
					break;
				case 'else':
					if (macro.opcode) throw 'Syntax error';
					close = true;
					open = true;
					code.push(						'} else {');
					break;
				}
				if (close) {
					// A closing control structure. See if the previous one
					// defined post processing, and if so, execute it now.
					var control = stack.control.pop();
					if (control.postProcess) {
						values = control.postProcess;
						postProcess = true;
						result = 'out.pop()';
					}
				}
				if (open) {
					// An opening control structure. Push it onto the stack:
					stack.control.push({ macro: macro, lineNumber: codeIndexBefore,
					 		postProcess: postProcess ? values : null });
					// Add out.push() before the block if it needs postProcessing
					if (postProcess)
						code.splice(codeIndexBefore, 0,	'out.push();');
				}
			}
		} else { // A normal <% %> macro
			if (macro.opcode) {
				// Setting a value? If not, this is a syntax error.
				if (macro.isSetter)
					code.push(						'var ' + macro.command + ' ' + this.parseLoopVariables(macro.opcode, stack) + ';');
				else
					throw 'Syntax error'; // No opcodes allowed in macros
			} else {
				var object = macro.object;
#ifdef HELMA
				// At runtime, first determine the object.
				// it might be a res.handler.
				if (!/^(global|this|root)$/.test(object))
					code.push(						'try {',
													'	var obj = ' + object + ';',
													'} catch (e) {',
													'	var obj = res.handlers["' + object + '"];',
													'}');
				else
					code.push(						'var obj = ' + object + ';');
				object = 'obj';
#endif // HELMA
				// If the macro tag defines the swallow sign (-%>), set postProcess to true and call trim on the resulting string
				postProcess = postProcess | macro.swallow;
				// Macros can both write to res and return a value. prefix / suffix / filter applies to both,
				// encoding / default only to the value returned.
				// TODO: Compare with Helma, to see if that is really true. E.g. what happens when default is set
				// and the macro returns no value, but does write to res?
				code.push(		postProcess		?	'out.push();' : null,
													'var val = template.renderMacro("' + macro.command + '", ' + object + ', "' +
															macro.name + '", param, ' + this.parseLoopVariables(macro.arguments, stack) + ', out);',
								// Trim if swallow is defined:						
								macro.swallow	?	'if (val) val = val.toString().trim()' : null,
								postProcess		?	'template.write(out.pop()' + (macro.swallow ? '.trim()' : '') + ', ' + values.filters + ', ' + values.prefix + ', ' +
															values.suffix + ', null, out);' : null);
				result = 'val';
			}
		}
		if (result) { // Write the value out
			// Strip away possible ; at the end:
			result = result.match(/^(.*?);?$/)[1];
			if (values.encoder)
				result = values.encoder + '(' + result + ')';
			// Optimizations: Only call template.write if post processing is necessary.
			// Write out directly if it's all easy.
			if (postProcess)
				code.push(							'template.write(' + result + ', ' + values.filters + ', ' + values.prefix + ', ' +
															values.suffix + ', ' + values['default']  + ', out);');
			else {
				if (toString) {
					// This is needed for nested macros. Whenn there is no post processing,
					// we can actually simply return the value
					return result;
				} else {
					// Dereference to local variable if it's a call, a lookup, or a more complex construct (containg whitespaces)
					// TODO: Detect strings and simple values and do not do if check bellow if it is valid!
					if (/[.()\s]/.test(result)) {
						code.push(					'var val = ' + result + ';');
						result = 'val';
					}
					code.push(						'if (' + result + ' != null && ' + result + ' !== "")',
													'	out.write(' + result + ');');
					if (values['default'])
						code.push(					'else',
													'	out.write(' + values['default'] + ');');
				}
			}
		}
		if (toString && postProcess) {
			// This is needed for nested macros. Insert out.push() before the 
			// rendering code and return out.pop(). Due to the post processing
			// we cannot simply return a variable...
			code.splice(codeIndexBefore, 0,			'out.push();');
			return 'out.pop()';
		}
		// Close the condition block now, if needed.
		if (condition)
			code.push(								'}');
		// Tell parse() wether to swallow the line break or not.
		if (!toString)
			return macro.swallow;
	},

	/**
	 * Parses the passed string for loop variable related calls (e.g. $entry#isFirst)
	 * and replaces them with the proper code.
	 */
	parseLoopVariables: function(str, stack) {
		return str.replace(/(\$[\w_]+)\#(\w+)/g, function(part, variable, suffix) {
			// Use the last loop.
			var loopStack = stack.loop[variable], loop = loopStack && loopStack[loopStack.length - 1];
			if (loop) {
				switch (suffix) {
				case 'index': return loop.index;
				case 'length': return loop.length;
				case 'isFirst': return '(' + loop.index + ' == 0)';
				case 'isLast': return '(' + loop.index + ' == ' + loop.length + ' - 1)';
				case 'isEven': return '((' + loop.index + ' & 1) == 0)';
				case 'isOdd': return '((' + loop.index + ' & 1) == 1)';
				}
			}
			return part;
		});
	},

	/**
	 * Parses a tempate tag and creates a new sub tempalte in the subTemplates
	 * array. Also handles the case where a template needs to directly be rendered
	 * to a varible.
	 */
	parseTemplateTag: function(tag, code) {
		var match = tag.tag.match(/^<%\s*([$#])(\S*)\s*([+-]?)%>$/);
		if (match) {
			var name = match[2], content = tag.buffer.join(''), end = match[3];
			// If the tag ends with -%>, trim the whole content.
			// If it does not end with +%>, cut away first and last empty line:
			// If it ends with +%>, keep the whitespaces.
			if (!end) content = content.match(/^\s*[\n\r]?([\u0000-\uffff]*)[\n\r]?\s*$/)[1];
			else if (end == '-') content = content.trim();
			new Template(content, name, this);
			// If it is a variable, push it onto renderTemplates, so it is
			// rendered at the beginning of the generated render function.
			if (match[1] == '$')
				this.renderTemplates.push({ name: name, trim: end == '-' });
		} else
			throw 'Syntax error in template';
	},

	/**
	 * Writes out the value and handles prefix, suffix, default, and filter chains.
	 * This is called at rendering time, not parsing time.
	 */
	write: function(value, filters, prefix, suffix, deflt, out) {
		if (value != null && value !== '') {
			// Walk through the filters and apply them, if defined.
			if (filters) {
				for (var i = 0; i < filters.length; i++) {
					var filter = filters[i];
					var func = filter.object && filter.object[filter.name + '_filter'];
					if (func) {
						if (func.apply) // filter function
							value = func.apply(filter.object, [value].concat(filter.arguments));
						else if (func.exec) // filter regexp
							value = func.exec(value)[0];
					} else {
						// TODO: How to handle encode on server / client side?
						// see renderMacro()
						out.write('[Filter unhandled: "' + filter.command + '"]');
					}
				}
			}
			// TODO: where do we need to add the prefixes? compare with Helma
			if (prefix) out.write(prefix);
			out.write(value);
			if (suffix) out.write(suffix);
		} else if (deflt) {
			// write out default value if it's defined and if
			// the returned value was not set
			out.write(deflt);
		}
	},

	/**
	 * Renders the macro with the given name on object, passing it the arguments.
	 * This is called at rendering time, not parsing time.
	 */
	renderMacro: function(command, object, name, param, args, out) {
		var unhandled = false, value;
		if (object) {
			// See  if there's a macro with that name, and if not, assume a property
			var macro = object[name + '_macro'];
			if (macro) {
				try {
					// Add a reference to this template and the param
					// object of the template as the parent to inherit from.
					var prm = args[0];
					// If a macro sets param=, all the fields from this object
					// are to be merged into its param object. But only if they
					// are not defined already:
					if (prm.param)
						for (var i in prm.param)
							if (prm[i] === undefined)
								prm[i] = prm.param[i];
					prm.__template__ = this.parent || this;
					prm.__param__ = param;
					// Also pass __out__, so if a macro wants to directly render
					// there and does not want to rely on res to be around (e.g.)
					// compatibility with browser and server), it can:
					prm.__out__ = out;
#ifdef HELMA
					// On Helma, dontEnum these fields, so for-in does not see them.
					prm.dontEnum('__template__', '__param__', '__out__');
#endif // !HELMA
					value = macro.apply(object, args);
				} catch (e) {
					var tag = this.getTagFromException(e);
					var message = e.message || e;
					if (tag && tag.content) {
						message += ' (' + e.fileName + '; line ' + tag.lineNumber + ': ' +
#ifdef HELMA
							encode(tag.content) + ')';
#else // !HELMA
							// TODO: How to handle encode on server / client side?
							tag.content + ')';
#endif // !HELMA
					} else if (e.fileName) {
						message += ' (' + e.fileName + '; line ' + e.lineNumber + ')';
					}
					out.write('[Macro error in ' + command + ': ' + message + ']');
				}
			} else {
				value = object[name];
				if (value === undefined)
					unhandled = true;
			}
		} else {
			unhandled = true;
		}
		if (unhandled)
			out.write('[Macro unhandled: "' + command + '"]');
		return value;
	},

	/**
	 * Converts the passed object to an iteration list. This is needed in foreach,
	 * as requested by users on the Helma-user list.
	 * This adds weight though, is it really needed?
	 * TODO: consider creating a MICRO version with less features for browser.
	 */
	toList: function(obj) {
		var ret = [];
		// Support for .each, where Bootstrap is loaded and a plain for-in loop
		// not supported any longer.
		// TODO: consider moving to Bootstrap completely!
		if (obj.each)
			obj.each(function(v) { ret.push(v); });
		else
			for (var i in obj) { ret.push(obj[i]); }
		return ret;
	},

	/**
	 * Reads and parses the template, compiles the generated render function
	 * and stores it in the template object.
	 */
	compile: function() {
		try {
#ifdef RHINO
			var lines;
			if  (this.resource) {
#ifdef HIDDEN
			 	var content = this.resource.getContent(getProperty('skinCharset'));
			 	// Store the original lines:
			 	var lines = content.split(/\r\n|\n|\r/mg);
#endif // HIDDEN
				// Use java.io.BufferedReader for reading the lines into a line array,
				// as this is much faster than the regexp above
#ifdef HELMA
				var charset = getProperty('skinCharset');
				var reader = new java.io.BufferedReader(
					charset ? new java.io.InputStreamReader(this.resource.getInputStream(), charset) :
						new java.io.InputStreamReader(this.resource.getInputStream())
				);
#else // !HELMA
				var reader = new java.io.BufferedReader(
					new java.io.InputStreamReader(this.resource.getInputStream()));
#endif // !HELMA
				lines = [];
				var line;
				while ((line = reader.readLine()) != null)
					lines.push(line);
				reader.close();
				this.lastModified = this.resource.lastModified();
			} else if (this.content) {
				lines = this.content.split(/\r\n|\n|\r/mg);
			} else {
				lines = [];
			}
#else // !RHINO
			var lines = this.content.split(/\r\n|\n|\r/mg);
#endif // !RHINO
			this.subTemplates = {};
			// Keep a reference to all sub templates to be
			// rendered into variable names (as defined by <% $name %> tags...)
			this.renderTemplates = [];
			var code = this.parse(lines);
			// Now evalute the template code.
#ifdef RHINO
			// This sets this.__render__ to the generated function
			// don't use eval() but Rhino's evaluateString instead, because this
			// throws propper traceable exceptions if something goes wrong.
			// switch optimization level for the compilation of this routine,
			// as java bytecode methods have a maximum size that is too small
			// for templates.
			var cx = Packages.org.mozilla.javascript.Context.getCurrentContext();
			var level = cx.getOptimizationLevel();
			cx.setOptimizationLevel(-1);
			cx.evaluateString(this, code, this.pathName, 0, null);
			cx.setOptimizationLevel(level);
#else // !RHINO
			eval(code);
#endif // !RHINO
		} catch (e) {
			this.throwError(e);
		}
#ifdef HELMA
		this.lastChecked = new Date().getTime();
#endif // !HELMA
	},

#ifdef HELMA
	/**
	 * Tries to find the resource in resourceContainer.
	 */
	findResource: function() {
		var container = this.resourceContainer;
		if (container) {
			this.resource = container.getResource(this.resourceName);
			if (!this.resource)
				throw 'Cannot find template "' + this.resourceName + '" in "' + 
					(container._prototype ? container._prototype : container) + '".';
			this.lastModified = 0; // force compile
			this.tags = null;
			this.pathName = this.resource.getName();
		}
	},

	/**
	 * Checks the resource's lastModified value and compiles again
	 * in case it has changed. Only checks every second.
	 */
	checkResource: function() {
		var now = new Date().getTime();
		// only check for modifications every second.
		if (now - this.lastChecked > 1000) {
			this.lastChecked = now;
			if (!this.resource || !this.resource.exists())
				this.findResource();
			if  (this.lastModified != this.resource.lastModified())
				this.compile();
		}
	},
#endif // HELMA

	/**
	 * Reports a template error and prints the line causing the error
	 */
	throwError: function(error, line) {
		var tag = line ? this.getTagFromCodeLine(line) : this.getTagFromException(error);
		var message = 'Template error in ' + this.pathName;
		// if this error already comes from throwError, do not generate message again
		if (typeof error == 'string' && error.indexOf(message) == 0)
			throw error;
		if (tag) {
		 	message += ', line: ' + (tag.lineNumber + 1) + ', in ' +
#ifdef HELMA
		 		encode(tag.content);
			// Encode errors, as they are passed through to Jetty and appear
			// garbled otherwise
#else // !HELMA
				tag.content;
#endif // !HELMA
		}
		if (error) {
#ifdef RHINO
			var details = null;
			if (error.fileName && error.fileName != this.pathName) {
				details = 'Error in ' + error.fileName + ', line ' +
					error.lineNumber + ': ' + error;
			} else {
				details = error;
			}
			// now generate the stacktrace:
			if (error.javaException) {
				var sw = new java.io.StringWriter();
				error.javaException.printStackTrace(new java.io.PrintWriter(sw));
				details += '\nStacktrace:\n' + sw.toString();
			}
			if (details)
				message += ': ' + details;
#else // !RHINO
			message += ': ' + error;
#endif // !RHINO
		}
		throw message;
	},

	getTagFromCodeLine: function(number) {
		// walk up the code lines until there's a line number
		// linking the code line to a template line
		while (number >= 0) {
			var tag = this.tags[number--];
			if (tag) return tag;
		}
	},

	getTagFromException: function(e) {
		if (this.tags && e.lineNumber && e.fileName == this.pathName)
			return this.getTagFromCodeLine(e.lineNumber);
	}
}

#ifdef HELMA

HopObject.prototype.getTemplate = function(template) {
	var name = template;
	if (!(template instanceof Template)) {
		// Handle sub templates:
		var pos = name.indexOf('#');
		if (pos != -1) {
			template = this.getTemplate(name.substring(0, pos));
			if (template)
				return template.getSubTemplate(name.substring(pos + 1));
		}
		// Use a hashtable in __proto__.constructor as a cache for
		// template objects
		// __proto__ alone would not work, as it would be passed down
		// the heritance chain, and all templates would be filled in one
		// common cache in HopObject
		var ctor = this.__proto__.constructor, cache = ctor.__templates__;
		if (!cache) cache = ctor.__templates__ = {};
		template = cache[name];
	}
	if (!template) {
		// TODO: there might already be a cached template for this resource
		// in one of super prototypes... unfortunatelly, currently this engine
		// parses and caches the template again for each prototype, as we don't
		// know if getResource is returning a resource from the current
		// prototypes or one of the super prototypes
		template = cache[name] = new Template(this, name);
	} else {
		// If it was created before, check for modifications now
		template.checkResource();
	}
	return template;
};

/**
 * HopObject's renderTemplate function that is to be used from Helma.
 */
HopObject.prototype.renderTemplate = function(template, param, out) {
	template = this.getTemplate(template);
	if (template)
		return template.render(this, param, out);
}

HopObject.prototype.template_macro = function(param, name) {
	if (name[0] == '#') {
		return param.__template__.renderSubTemplate(this, name.substring(1), param);
	} else {
		return this.renderTemplate(name, param);
	}
}

/* TODO: reconsider this for rendering through HopObject constructors:
Function.prototype.renderTemplate = function(template, param, out) {
	if (!this.instance)
		this.instance = new this();
	return this.instance.renderTemplate(template, param, out);
}
*/

#else // !HELMA

/**
 * A dictionary with methods that can be injected into any prototype to 
 * get templating functionality.
 */
Template.methods = new function() {
	var templates = {};

	return {
		/*
		 * On Rhino, template can either be a template object or a file name
		 * to be loaded from the disk.
		 * On browsers, there is no file access, so the string is taken as
		 * the full template source, which is also used for lookups of cached
		 * template objects...
		 * TODO: Use browser embedded hidden textareas instead?
		 * TODO: On browser, subtemplates do not work, as name is actually
		 * the full code right now...
		 */
		getTemplate: function(template) {
			var name = template;
			if (!(template instanceof Template)) {
				// Handle sub templates:
				var pos = name.indexOf('#');
				if (pos != -1) {
					template = this.getTemplate(name.substring(0, pos));
					if (template)
						return template.getSubTemplate(name.substring(pos + 1));
				}
				template = templates[name];
			}
			if (!template)
				template = templates[name] = new Template(
#ifdef RHINO
					new java.io.File(baseDir + '/templates/' + name + '.jstl'));
#else // !RHINO
					name);
#endif // !RHINO
			return template;
		},

		renderTemplate: function(template, param, out) {
			try {
				template = this.getTemplate(template);
				if (template)
					return template.render(this, param, out);
			} catch (e) {
				error(e);
			}
		},

		template_macro: function(param, name) {
			if (name[0] == '#') {
				return param.__template__.renderSubTemplate(this, name.substring(1), param);
			} else {
				return this.renderTemplate(name, param);
			}
		}
	};
};

#endif // !HELMA