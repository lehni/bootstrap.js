#comment Compose hidden fields

#define HIDDEN_FIELDS_1 statics|_generics|_preserve
#define HIDDEN_FIELDS_2 HIDDEN_FIELDS_1
#define HIDDEN_FIELDS_3 HIDDEN_FIELDS_2

#define HIDDEN_FIELDS HIDDEN_FIELDS_3

// TODO: BROWSER?
#ifdef BROWSER
# comment Add prototype|constructor|toString|valueOf|
#define HIDDEN_FIELDS_2 prototype|constructor|toString|valueOf|HIDDEN_FIELDS_1
#endif // BROWSER

#ifdef BEANS
# comment Add _beans
#define HIDDEN_FIELDS_3 HIDDEN_FIELDS_2|_beans
#endif // BEANS
