# Bootstrap JavaScript Library
# (c) 2006-2007 Juerg Lehni, http://scratchdisk.com/
#
# Bootstrap is released under the MIT license
# http://bootstrap-js.net/
#
# build.sh
# 
# The build script that produces all the different versions of the
# bootstrap library:
#
# bootstrap.js          For new generation browsers.
# bootstrap-legacy.js   For legacy browsers (IE 5, Opera 7, etc)
# bootsrap-rhino.js     For Rhino based JS engines in Java
# bootstrap-helma.js    For Helma, the JS Web Application Server
# 
# Usage:
# build.sh MODE
#
# MODE:
#     commented    Preprocessed but still formated and commented (default)
#     stripped     Formated but without comments
#     compressed   No comments and no whitespaces

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
./preprocess.sh ../src/build.js ../out/bootstrap.js "-DBROWSER" $MODE
./preprocess.sh ../src/build.js ../out/bootstrap-legacy.js "-DBROWSER -DBROWSER_LEGACY" $MODE
./preprocess.sh ../src/build.js ../out/bootstrap-rhino.js "-DRHINO" $MODE
./preprocess.sh ../src/build.js ../out/bootstrap-helma.js "-DRHINO -DHELMA" $MODE
if [ -d ../src/tests/ ]
./preprocess.sh ../src/tests/bootstrap-test.html.in ../out/bootstrap-test.html "-DBROWSER -DBROWSER_LEGACY" $MODE
./preprocess.sh ../src/tests/element-test.html.in ../out/element-test.html "-DBROWSER -DBROWSER_LEGACY" $MODE
fi
