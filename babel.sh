#!/bin/bash

if [ -z "$EDITOR" ]; then
    EDITOR=vim
fi

if hash pybabel; then
    echo "pybabel found"
else
    echo "pybabel not found"
    exit
fi

if [ -z "$@" ]; then
    echo "usage:"
    echo "sh babel.sh init"
    echo "    initializes translation files. If you already had the files, you want to"
    echo "    update instead."
    echo "sh babel.sh update"
    echo "    updates the translation files for new translations."
elif [ "$1" = "init" ]; then
    pybabel extract -F babel.cfg -o messages.pot .
    pybabel init -i messages.pot -d main/translations -l "fi"
    $EDITOR main/translations/*/*/messages.po
    pybabel compile -d main/translations
elif [ "$1" = "update" ]; then
    pybabel extract -F babel.cfg -o messages.pot .
    pybabel update -i messages.pot -d main/translations
    $EDITOR main/translations/*/*/messages.po
    pybabel compile -d main/translations
fi
