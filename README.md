# hiski-visualizer
Web service for visualizing genealogical dataset HisKi


First time setup
----------------

source environment.sh
python manage.py db create
python manage.py populate gedcom <gedcom-file>
python manage.py run

then access the address mentioned from browser.


Changing data
-------------

python manage.py db delete create
python manage.py populate gedcom <gedcom-file>
python manage.py run
