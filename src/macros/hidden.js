#comment Compose hidden fields

#define HIDDEN_FIELDS_1 statics|generics|preserve
#define HIDDEN_FIELDS_2 HIDDEN_FIELDS_1
#define HIDDEN_FIELDS_3 HIDDEN_FIELDS_2

#define HIDDEN_FIELDS HIDDEN_FIELDS_3

// TODO: BROWSER?
#ifdef BROWSER
#comment Add prototype|constructor|toString|valueOf|
#define HIDDEN_FIELDS_2 prototype|constructor|toString|valueOf|HIDDEN_FIELDS_1
#endif // BROWSER

#ifdef BEANS
# comment Add beans
#ifdef BEANS_OLD
#comment Scriptographer needs _beans around still as some scripts are using it.
#define HIDDEN_FIELDS_3 HIDDEN_FIELDS_2|beans|_beans
#else // !BEANS_OLD
#define HIDDEN_FIELDS_3 HIDDEN_FIELDS_2|beans
#endif // !BEANS_OLD
#endif // BEANS
