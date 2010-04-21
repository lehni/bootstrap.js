#define COMMENT(str)
#comment COMMENT allows the definition of comments that are removed even when
#comment js comments are not stripped from the source code.

#ifdef HELMA
#define GETTER_SETTER
#define BEANS
#endif // HELMA

#ifndef GETTER_SETTER
#comment No beans without native getter / setter support
#undef BEANS
#endif // !GETTER_SETTER

#ifdef BEANS
#comment Define the BEANS_TRUE Macro, to be added to the object that defines the
#comment fields to be injected, if getters and setters should be produced if the
#comment function name matches this form: get/set/is[A-Z]...
#comment This only does something if getter / setter support is there.
#define BEANS_TRUE beans: true,
#else // !BEANS
#define BEANS_TRUE
#endif // !BEANS

#comment It appears that __proto__ is broken on IE browsers, so we even need it
#comment for non legacy browsers:
#ifndef RHINO
#define FIX_PROTO
#endif // !RHINO

#include "hidden.js"
#include "globals.js"