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
#else // !BROWSER_LEGACY
#comment CHECK_PROPERTY is not needed, since we are not adding anything to the
#comment objects themselves, only to their prototypes, and thats filtered out
#comment already.
#endif // !BROWSER_LEGACY

#ifdef GETTER_SETTER
#define PROPERTY_CONDITION(obj, name, condition) !obj.__lookupGetter__(name) && condition
#else // !GETTER_SETTER
#define PROPERTY_CONDITION(obj, name, condition) condition
#endif // !GETTER_SETTER

#ifdef CHECK_PROPERTY
#define PROPERTY_IS_VISIBLE(obj, name, condition) PROPERTY_CONDITION(obj, name, condition) && CHECK_PROPERTY(name)
#define IF_PROPERTY_IS_VISIBLE(name, command) if (CHECK_PROPERTY(name)) command
#else // !CHECK_PROPERTY
#comment CHECK_PROPERTY is not defined -> !BROWSER_LEGACY
#comment No need to even check the name, since nothing will be set on objects
#comment and the policy to compare with the value from __proto__ is enough to
#comment filter out fields that are not supposed to iterate.
#define PROPERTY_IS_VISIBLE(obj, name, condition) PROPERTY_CONDITION(obj, name, condition)
#define IF_PROPERTY_IS_VISIBLE(name, command) command
#endif // !CHECK_PROPERTY
