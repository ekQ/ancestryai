# hiski-visualizer
Web service for visualizing genealogical dataset HisKi


First time setup
----------------

source environment.sh
python manage.py db create
python manage.py populate gedcom <gedcom-file>
python manage.py run

then access the address mentioned from browser.


Changing data (also needed when models change)
----------------------------------------------

python manage.py db delete create
python manage.py populate gedcom <gedcom-file>
python manage.py run


Recons format
-------------

Header file:
edges:          path/to/edgefile.json
individuals:    path/to/individualfile.json
parishes:       path/to/parishfile.json
villages:       path/to/villagefile.json

The other files contain json list of objects.
