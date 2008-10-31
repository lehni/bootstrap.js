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
#else // !BEANS
#define _BEANS
#endif // !BEANS

#comment It appears that __proto__ is broken on IE browsers, so we even need it
#comment for non legacy browsers:
#ifndef RHINO
#define FIX_PROTO
#endif // !RHINO

#comment When setting iterator functions or when using the legacy workaround for
#comment Function#apply, we need to check the field names to see if they are to
#comment be hidden. Anything starting with __ is omment hidden.
#comment Also, we need to filter out prototype (and constructor in legacy mode)
#comment as these are emurated on some browsers.
#comment name.indexOf('__') != 0 is faster than name.substring(0, 2) != '__'
#if defined(BROWSER_LEGACY)
#comment Allways filter out __ fields on legacy browsers, as they are used both
#comment for emulating Function#apply/#call and for faking __proto__
#define CHECK_PROPERTY(name) name.indexOf('__') != 0 && name != 'constructor'
#elif defined(SET_ITERATOR)
#define CHECK_PROPERTY(name) name.indexOf('__') != 0
#else // !SET_ITERATOR && !BROWSER_LEGACY
#comment CHECK_PROPERTY is not needed, since we are not adding anything to the
#comment objects themselves, only to their prototypes, and thats filtered out
#comment already.
#endif // !SET_ITERATOR && !BROWSER_LEGACY

#ifdef GETTER_SETTER
#define PROPERTY_CONDITION(obj, name, condition) !obj.__lookupGetter__(name) && condition
#else // !GETTER_SETTER
#define PROPERTY_CONDITION(obj, name, condition) condition
#endif // !GETTER_SETTER

#ifdef CHECK_PROPERTY
#define PROPERTY_IS_VISIBLE(obj, name, condition) PROPERTY_CONDITION(obj, name, condition) && CHECK_PROPERTY(name)
#define IF_PROPERTY_IS_VISIBLE(name, command) if (CHECK_PROPERTY(name)) command
#else // !CHECK_PROPERTY
#comment CHECK_PROPERTY is not defined -> !SET_ITERATOR && !BROWSER_LEGACY
#comment No need to even check the name, since nothing will be set on objects
#comment and the policy to compare with the value from __proto__ is enough to
#comment filter out fields that are not supposed to iterate.
#define PROPERTY_IS_VISIBLE(obj, name, condition) PROPERTY_CONDITION(obj, name, condition)
#define IF_PROPERTY_IS_VISIBLE(name, command) command
#endif // !CHECK_PROPERTY

#comment Compose hidden fields

#define HIDDEN_FIELDS_1 prototype|constructor|toString|valueOf|statics|_generics
#define HIDDEN_FIELDS_2 HIDDEN_FIELDS_1
#define HIDDEN_FIELDS_3 HIDDEN_FIELDS_2

#define HIDDEN_FIELDS HIDDEN_FIELDS_3

#ifdef BEANS
# comment Add _beans
#define HIDDEN_FIELDS_2 HIDDEN_FIELDS_1|_beans
#endif // BEANS

#ifdef DONT_ENUM
# comment Add _hide
#define HIDDEN_FIELDS_3 HIDDEN_FIELDS_2|_hide
#endif // DONT_ENUM

#comment Define BEAN_BLOCK OPEN / CLOSE for clean code.
#comment It is only needed when DONT_ENUM is defined, in which case there will be
#comment two statements inside the code block instead of one.

#ifdef DONT_ENUM

#define BEAN_BLOCK_OPEN {
#define BEAN_BLOCK_CLOSE }

#else // !DONT_ENUM

#define BEAN_BLOCK_OPEN
#define BEAN_BLOCK_CLOSE

#endif // !DONT_ENUM
