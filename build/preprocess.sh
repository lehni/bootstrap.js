# Bootstrap JavaScript Library
# (c) 2006-2007 Juerg Lehni, http://scratchdisk.com/
#
# Bootstrap is released under the MIT license
# http://bootstrap-js.net/
#
# preprocess.sh
#
# A simple code preprocessing wrapper that uses a combination of cpp, jssrip.py
# and sed to preprocess JavaScript files containing C-style preprocess macros
# (#include, #ifdef, etc.). Three options offer control over wether comments
# are preserved or stripped and whitespaces are compressed.
# 
# Usage:
# preprocess.sh SOURCE DESTINATION ARGUMENTS MODE
#
# ARGUMENTS:
#     e.g. "-DBROWSER -DBROWSER_LEGACY"
#
# MODE:
#     commented    Preprocessed but still formated and commented
#     stripped     Formated but without comments
#     compressed   No comments and no whitespaces

case $4 in
	stripped)
		cpp -P -C $3 $1 | ./jsstrip.py -w -q | sed -n '/^[ 	][ 	]*$/d
			/./,/^$/!d
			p' > $2
		;;
	compressed)
		cpp -P -C $3 $1 | ./jsstrip.py -q > $2
		;;
	commented)
		cpp -P -C $3 $1 | sed -n '/^[ 	][ 	]*$/d
			/./,/^$/!d
			p' > $2 > $2
		;;
esac
