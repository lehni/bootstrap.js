#define COMMENT(str)
#comment COMMENT allows the definition of comments that are removed even when
#comment js comments are not stripped from the source code.

#define BASE_NAME base

#ifdef HELMA
#comment Helma needs GETTER_SETTER support to work around the base / _base problem.
#define DONT_ENUM
#define GETTER_SETTER
#define BEANS
#define BASE_NAME _base
#endif // HELMA

#ifndef GETTER_SETTER
#comment No beans without native getter / setter support
#undef BEANS
#endif // !GETTER_SETTER

#ifdef DONT_ENUM
#comment Define the _HIDE parameter, to be added to the object that defines the
#comment fields to be injected, if dontEnum should be called for these fields.
#comment This only does something if dontEnum() is there.
#define _HIDE _hide: true,
#else // !DONT_ENUM
#define _HIDE
#endif // !DONT_ENUM

#ifdef BEANS
#comment Define the _BEANS parameter, to be added to the object that defines the
#comment fields to be injected, if getters and setters should be produced if the
#comment function name matches this form: get/set/is[A-Z]...
#comment This only does something if getter / setter support is there.
#define _BEANS _beans: true,
#define BEANS_VARIABLE , beans
#else // !BEANS
#define _BEANS
#define BEANS_VARIABLE
#endif // !BEANS

#comment It appears that __proto__ is broken on IE browsers, so we even need it
#comment for non legacy browsers:
#ifndef RHINO
#define FIX_PROTO
#endif // !RHINO

#include "enum.js"
#include "hidden.js"