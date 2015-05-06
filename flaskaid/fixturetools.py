# version 1.0 of fixturetools modified from elixir to sqlalchemy declarative layer

from main import app
from main import database
from main.database import session
from sqlalchemy import Table
import json


import json
import datetime
from time import mktime

class Encoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime.datetime):
            encobj = {
                "type": "datetime",
                "value": int(mktime(obj.timetuple())),
            }
            return encobj
        return json.JSONEncoder.default(self, obj)
def from_json(obj):
    if "type" in obj and obj["type"] == "datetime":
        return datetime.datetime.fromtimestamp(obj["value"])
    return obj

def export_dict():
    table_names = database.metadata.tables.keys()
    data = {}
    for table_name in table_names:
        data[table_name] = []
        table = Table(table_name, database.metadata, autoload=True)
        columns = table.columns.keys()
        for row in database.session.query(table):
            data[table_name].append({k:x for k,x in zip(columns, row)})
    return data
def export_file(fname):
    data = export_dict()
    f = open(fname, "w")
    json.dump(data, f, indent=4, cls=Encoder)
    f.close()

def import_dict(data):
    table_names = database.metadata.tables.keys()
    for table_name in table_names:
        if table_name in data:
            table = Table(table_name, database.metadata, autoload=True)
            for d in data[table_name]:
                iq = table.insert().values(**d)
                session.execute(iq)
    session.commit()
def import_file(fname):
    f = open(fname)
    data = json.load(f, object_hook=from_json)
    f.close()
    import_dict(data)

