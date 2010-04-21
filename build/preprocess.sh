# Bootstrap JavaScript Library
# (c) 2006 - 2010 Juerg Lehni, http://scratchdisk.com/
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
#	e.g. "-DBROWSER -DECMASCRIPT_3"
#
# MODE:
#	commented	Preprocessed but still formated and commented
#	stripped	Formated but without comments
#	compressed	No comments and no whitespaces

case $4 in
	stripped)
		./filepp.pl $3 $1 | ./jsstrip.pl -w -q | sed -n '/^[ 	][ 	]*$/d
			/./,/^$/!d
			p' > $2
		;;
	compressed)
		./filepp.pl $3 $1 | ./jsstrip.pl -q > $2
		;;
	commented)
		./filepp.pl $3 $1 | sed -n '/^[ 	][ 	]*$/d
			/./,/^$/!d
			p' > $2
		;;
esac
