#!/bin/bash

env="environment"
req="pip-packages.txt"

echo "environment activation requires sourcing"
echo ""
echo "source environment.sh"
echo "    create environment $env if missing"
echo "    activate the environment"
echo "    install packages from $req if such file exists"
echo ""
echo "sh environment.sh freeze"
echo "    create $req from the currently installed packages"
echo ""
echo "source environment.sh stop"
echo "    deactivates the environment"
echo ""
echo "-----------------------------------------------------------"

if [ "$1" = "freeze" ]; then
    echo "writing list of packages to $req"
    pip freeze > $req
elif [ "$1" = "stop" ]; then
    echo "deactivating the environment"
    deactivate
else
    if [ ! -d $env ]; then
        echo "creating $env"
        virtualenv $env
        echo "activating $env"
        if [ -f $env/bin/activate ]; then
            . $env/bin/activate
            if [ -f $req ]; then
                echo "installing from $req"
                pip install -r $req
            fi
        else
            echo "$env/bin/activate does not exist, something went wrong"
        fi
    else
        echo "activating $env"
        if [ -f $env/bin/activate ]; then
            . $env/bin/activate
        else
            echo "$env/bin/activate does not exist, something went wrong"
        fi
    fi
fi
