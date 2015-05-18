
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.schema import MetaData

engine = None
session = None
Base = None
metadata = None

def init_database(app):
    global engine, session, Base, metadata
    engine = create_engine(
            app.config["DB_URI"],
            echo=False,
            convert_unicode=True,
            )
    session = scoped_session(sessionmaker(
            autocommit = False,
            autoflush = False,
            bind = engine,
            ))
    metadata = MetaData()
    Base = declarative_base(metadata=metadata)
    Base.query = session.query_property()

def manage_create():
    # import . to create all different models
    from . import app
    Base.metadata.create_all(bind=engine)
