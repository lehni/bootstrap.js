#define COMMENT(str)
#comment COMMENT allows the definition of comments that are removed even when
#comment js comments are not stripped from the source code.

#ifdef HELMA
#define GETTER_SETTER
#define BEANS
#endif // HELMA

#ifdef BEANS
#comment Native getter / setter support is needed for beans
#define GETTER_SETTER
#endif // BEANS

#ifdef BEANS
#comment Define the BEANS_TRUE Macro, to be added to the object that defines the
#comment fields to be injected, if getters and setters should be produced if the
#comment function name matches this form: get/set/is[A-Z]...
#comment This only does something if getter / setter support is there.
#define BEANS_TRUE beans: true,
#else // !BEANS
#define BEANS_TRUE
#endif // !BEANS

#ifdef BROWSER
#comment It appears that __proto__ is broken on IE browsers, so we even need it
#comment for non legacy browsers:
#define FIX_PROTO
#endif // BROWSER

#ifdef ECMASCRIPT_5
#comment ECMAScript version 5 also includes the full version 3 standard.
#define ECMASCRIPT_3
#endif // ECMASCRIPT_5

#include "hidden.js"
#include "globals.js"