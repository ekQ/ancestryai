
if [ -z "$@" ]; then
    echo "sh $0 <gedcomtest>"
    echo ""
    echo "Where gedcomtest is a gedcom file containing the test tree. Such files are"
    echo "placed to ./gedcom/tests/ . Loading a test will recreate the database, so if"
    echo "you don't want to lose everything there, export it before starting a test."
    echo "After loading a test, navigate browser to the website, open the Testnote tab"
    echo "from an item view and read what the test is testing and expecting. Open the"
    echo "nodes in marked order and see if the behaviour is correct."
else
    python manage.py db delete create
    python manage.py populate gedcom "$1"
    python manage.py run debug
fi

