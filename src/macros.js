#define COMMENT(str)
#comment COMMENT allows the definition of comments that are removed even when
#comment js comments are not stripped from the source code.

#define BASE_NAME() base

#ifdef HELMA
#comment Helma has its own dontEnum() method and does not need an emulation.
#comment Helma needs GETTER_SETTER support to work around the base / _base problem.
#undef DONT_ENUM
#define RHINO_DONT_ENUM
#define GETTER_SETTER
#define BASE_NAME() _base
#endif // HELMA

#if (defined(SET_ITERATOR) || defined(BROWSER_LEGACY)) && defined(DONT_ENUM) && !defined(EXTEND_OBJECT)
#comment Setting functions on bind objects with using DONT_ENUM is only supported
#comment when EXTEND_OBJECT is activated. As otherwise dontEnum() cannot be used
#comment to hide the iterator method on objects not inheriting from Base (e.g. a
#comment simple object literal). So lets turn off DONT_ENUM.
#undef DONT_ENUM
#endif // (SET_ITERATOR || BROWSER_LEGACY) && DONT_ENUM && !EXTEND_OBJECT

#if defined(DONT_ENUM) || defined(RHINO_DONT_ENUM)
#comment Define the HIDE parameter, to be added to extend() after the object
#comment that defines the fields to be injected, if dontEnum should be called
#comment for these fields. This only does something if dontEnum() is there.
#define HIDE _hide: true,
#else // !DONT_ENUM && !RHINO_DONT_ENUM
#define HIDE
#endif // !DONT_ENUM && !RHINO_DONT_ENUM

#comment It appears that __proto__ is broken on IE browsers, so we even need it
#comment for non legacy browsers:
#ifndef RHINO
#define FIX_PROTO
#endif // !RHINO

#ifndef DONT_ENUM
#comment When setting iterator functions without using dontEnum or when using
#comment the legacy workaround for Function#apply, we need to check the field
#comment names to see if they are to be hidden. Anything starting with __ is
#comment hidden, but only when not in DONT_ENUM mode!
#comment Also, we need to filter out prototype (and constructor in legacy mode)
#comment as these are emurated on some browsers.
#comment name.indexOf('__') != 0 is faster than name.substring(0, 2) != '__'
#if defined(BROWSER_LEGACY)
#comment Allways filter out __ fields on legacy browsers, as they are used both
#comment for emulating Function#apply/#call and for faking __proto__
#define CHECK_NAME(name) name.indexOf('__') != 0 && name != 'constructor'
#elif defined(SET_ITERATOR)
#define CHECK_NAME(name) name.indexOf('__') != 0
#else // !SET_ITERATOR && !BROWSER_LEGACY
#comment CHECK_NAME is not needed, since we are not adding anything to the
#comment objects themselves, only to their prototypes, and thats filtered out
#comment already.
#endif // !SET_ITERATOR && !BROWSER_LEGACY

#ifdef CHECK_NAME
#define NAME_IS_VISIBLE(name, condition) condition && CHECK_NAME(name)
#define IF_NAME_IS_VISIBLE(name, command) if (CHECK_NAME(name)) command
#else // !CHECK_NAME
#comment CHECK_NAME is not defined -> !SET_ITERATOR && !BROWSER_LEGACY
#comment No need to even check the name, since nothing will be set on objects
#comment and the policy to compare with the value from __proto__ is enough to
#comment filter out fields that are not supposed to iterate.
#define NAME_IS_VISIBLE(name, condition) condition
#define IF_NAME_IS_VISIBLE(name, command) command
#endif // !CHECK_NAME

#endif // !DONT_ENUM