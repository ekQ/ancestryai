
import os
from flask import (
    Flask,
    g,
    request,
)
from flask.ext.debugtoolbar import DebugToolbarExtension
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import config
import database


def create_app():
    app = Flask(__name__)
    app.config.from_object("config")

    database.init_database(app)

    app.toolbar = DebugToolbarExtension(app)

    @app.before_request
    def before_request():
        g.context = {}

#    elixir.setup_all()

    return app

app = create_app()

from .views import *
from .models import *

