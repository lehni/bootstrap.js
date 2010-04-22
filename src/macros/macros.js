#define COMMENT(str)
#comment COMMENT allows the definition of comments that are removed even when
#comment js comments are not stripped from the source code.

#ifdef HELMA
#define BEANS
#endif // HELMA

#ifdef BEANS
#comment Beans are getters and setters that are produced if function names
#comment match this form: get/set/is[A-Z].

#comment Native getter / setter support is needed for beans
#define PROPERTY_DEFINITION

#comment Define the BEANS_TRUE Macro, to be added to the object that defines the
#comment fields to be injected
#define BEANS_TRUE beans: true,
#else // !BEANS
#define BEANS_TRUE
#endif // !BEANS

#ifdef BROWSER
#comment It appears that __proto__ is not supported on IE and Opera browsers,
#comment so we need the fix for non legacy browsers too:
#define FIX_PROTO
#endif // BROWSER

#ifdef ECMASCRIPT_5
#comment ECMAScript version 5 also includes the full version 3 standard.
#define ECMASCRIPT_3
#endif // ECMASCRIPT_5

#include "hidden.js"
#include "globals.js"