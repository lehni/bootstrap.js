//#comment Compose hidden fields by appending macros to each other

//#comment Standard hidden fields used in inject() / extend()
//#define HIDDEN_FIELDS_1 statics|generics|preserve

//#ifdef BEANS
//#comment Add beans to hidden fields.
//#ifdef BEANS_OLD
//#comment Scriptographer needs _beans around as some scripts are still using it.
//#define HIDDEN_FIELDS_2 HIDDEN_FIELDS_1|_?beans
//#else // !BEANS_OLD
//#define HIDDEN_FIELDS_2 HIDDEN_FIELDS_1|beans
//#endif // !BEANS_OLD
//#else // !BEANS
//#define HIDDEN_FIELDS_2 HIDDEN_FIELDS_1
//#endif // !BEANS

//#comment Add prototype to the hidden fields as some JS engines iterate over it
//#comment on constructors (e.g. Safari and Firefox). There seems to be no 
//#comment explicit statement on whether this should be enumerable or not anywhere,
//#comment in the specifications, but Bootstrap should not copy this over when
//#comment inheriting static propreties from the constructor in extend().
//#define HIDDEN_FIELDS_3 HIDDEN_FIELDS_2|prototype

//#ifndef PROPERTY_DEFINITION
//#comment If constructor cannot be hidden by setting enumerable: false in define(),
//#comment we need to explicitely add it to the hidden fields.
//#define HIDDEN_FIELDS_4 HIDDEN_FIELDS_3|constructor
//#else // PROPERTY_DEFINITION
//#define HIDDEN_FIELDS_4 HIDDEN_FIELDS_3
//#endif // PROPERTY_DEFINITION

//#ifdef BROWSER
//#comment Add toString,valueOf to the hidden fields on browsers, as they are never
//#comment enumerated on IE and therefore need to be copied explicitely if defined,
//#comment see Base.js.
//#comment Also add __proto__, as this is simulated for non-supporting browsers,
//#comment mainly IE and Opera.
//#define HIDDEN_FIELDS_5 HIDDEN_FIELDS_4|__proto__|toString|valueOf
//#else // !BROWSER
//#define HIDDEN_FIELDS_5 HIDDEN_FIELDS_4
//#endif // !BROWSER

//#define HIDDEN_FIELDS HIDDEN_FIELDS_5
