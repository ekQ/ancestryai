import os
basedir = os.path.abspath(os.path.dirname(__file__))
BASEDIR = basedir

DEBUG_TB_INTERCEPT_REDIRECTS = False

CSRF_ENABLED = True
SECRET_KEY = "secret_key"

DB_URI = "sqlite:///{0}".format(os.path.join(basedir, "data.db"))

