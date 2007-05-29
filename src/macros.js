#define COMMENT(str)
#comment COMMENT allows the definition of comments that are removed even when
#comment js comments are not stripped from the source code.

#ifdef HELMA
#comment Helma has its own dontEnum() method and does not need an emulation.
#undef DONT_ENUM
#endif // HELMA

#if defined(DONT_ENUM) || defined(HELMA)
#comment Define the HIDE parameter, to be added to extend() after the object
#comment that defines the fields to be injected, if dontEnum should be called
#comment for these fields. This only does something if dontEnum() is there.
#define HIDE , true
#else // !DONT_ENUM && !HELMA
#define HIDE
#endif // !DONT_ENUM && !HELMA

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
#define AND_NAME_IS_VISIBLE(NAME) && NAME.indexOf('__') != 0 && NAME != 'constructor'
#elif defined(SET_ITERATOR)
#define AND_NAME_IS_VISIBLE(NAME) && NAME.indexOf('__') != 0
#else // !SET_ITERATOR && !BROWSER_LEGACY
#define AND_NAME_IS_VISIBLE(NAME)
#endif // !SET_ITERATOR && !BROWSER_LEGACY

#ifdef EXTEND_OBJECT
#define EACH(OBJECT, ARGS...) OBJECT.each(ARGS)
#else // !EXTEND_OBJECT
#define EACH(OBJECT, ARGS...) $each(OBJECT, ARGS)
#endif // !EXTEND_OBJECT