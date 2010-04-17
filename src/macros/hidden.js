#comment Compose hidden fields

#define HIDDEN_FIELDS_1 prototype|constructor|toString|valueOf|statics|_generics|_preserve
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

