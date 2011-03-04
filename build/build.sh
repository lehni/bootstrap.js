# Bootstrap JavaScript Library
# (c) 2006 - 2011 Juerg Lehni, http://lehni.org/
#
# Bootstrap is released under the MIT license
# http://bootstrapjs.org/
#
# build.sh
#
# The build script that produces all the different versions of the
# bootstrap library:
#
# bootstrap-browser.js	For new generation browsers.
# bootsrap-rhino.js		For Rhino based JS engines in Java
# bootstrap-helma.js	For Helma, the JS Web Application Server
#
# Usage:
# build.sh MODE
#
# MODE:
#	commented		Preprocessed but still formated and commented (default)
#	stripped		Formated but without comments
#	compressed		No comments and no whitespaces
#	compiled		Uses Google Closure Compiler to reduce file size even more

if [ $# -eq 0 ]
then
	MODE="commented"
else
	MODE=$1
fi

# Create the out folder if it does not exist yet.
if [ ! -d ../out/ ]
then
	mkdir ../out/
fi

./preprocess.sh ../src/build.js ../out/bootstrap-browser.js "-DBROWSER -DDEBUG -DDEFINE_GLOBALS" $MODE
./preprocess.sh ../src/build.js ../out/bootstrap-beans.js "-DBROWSER -DECMASCRIPT_3 -DBEANS -DDEBUG -DDEFINE_GLOBALS" $MODE

./preprocess.sh ../src/build.js ../out/bootstrap-rhino.js "-DRHINO -DECMASCRIPT_5 -DEXTEND_OBJECT -DBEANS -DDEBUG -DDEFINE_GLOBALS" $MODE
./preprocess.sh ../src/build.js ../out/bootstrap-helma.js "-DHELMA -DRHINO  -DECMASCRIPT_5 -DEXTEND_OBJECT -DBEANS -DDEBUG -DDEFINE_GLOBALS" $MODE
./preprocess.sh ../src/build.js ../out/bootstrap-scriptographer.js "-DRHINO -DECMASCRIPT_5 -DEXTEND_OBJECT -DBEANS -DBEANS_OLD -DDEBUG -DDEFINE_GLOBALS" $MODE

# tests, turn off for now by adding __

if [ -d ../src/tests__/ ]
then
./preprocess.sh ../src/tests/bootstrap-test.html.in ../out/bootstrap-test.html "-DBROWSER -DDEBUG -DDEFINE_GLOBALS" $MODE
./preprocess.sh ../src/tests/element-test.html.in ../out/element-test.html "-DBROWSER -DDEBUG -DDEFINE_GLOBALS" $MODE
fi
