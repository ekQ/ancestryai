
import json
import time
from sqlalchemy import *
from sqlalchemy.orm import *
from main.database import Base, session
from pbkdf2 import crypt

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(Unicode(64))
    passhash = Column(Unicode(64))

    @classmethod
    def create(cls, **kwargs):
        kwargs["passhash"] = crypt(kwargs["password"])
        del kwargs["password"]
        return cls(**kwargs)

    def check_password(self, tryword):
        tryhash = crypt(tryword, self.passhash)
        return tryhash == self.passhash

family_parent_link = Table("family_parent_link", Base.metadata,
    Column("individual_id", Integer, ForeignKey("individual.id")),
    Column("family_id", Integer, ForeignKey("family.id")),
)
family_child_link = Table("family_child_link", Base.metadata,
    Column("individual_id", Integer, ForeignKey("individual.id")),
    Column("family_id", Integer, ForeignKey("family.id")),
)
models_times = {
    "fetch-fields": 0,
    "fetch-fields-fetch": 0,
    "fetch-fields-singlify": 0,
    "fetch-fields-simplify": 0,
    "create-obj": 0,
    "json-dump": 0,
}

class Individual(Base):
    __tablename__ = "individual"
    id = Column(Integer, primary_key=True)
    xref = Column(Unicode(16), index=True, unique=True)
    tag = Column(Unicode(4))
#    name = Column(Unicode(256))
#    name_first = Column(Unicode(128))
#    name_family = Column(Unicode(128))
#    sex = Column(Unicode(1))
#    birth_date_string = Column(Unicode(64))
#    birth_date_year = Column(Integer)
#    birth_date = Column(Date)
#    death_date_string = Column(Unicode(64))
#    death_date_year = Column(Integer)
#    death_date = Column(Date)

#    soundex6first = Column(Unicode(6))
#    soundex6family = Column(Unicode(6))
#    soundex3first = Column(Unicode(3))
#    soundex3family = Column(Unicode(3))

#    loaded_gedcom = Column(UnicodeText)

    dict_json = Column(Text)

    fields = relationship("IndividualField",
#            backref = "individual",
#            lazy="immediate",
            )

    def field_dict(self):
        t0 = time.time()
        fields = [x for x in self.fields]
        t1 = time.time()
        res = {}
        for field in fields:
            tup = (field.certainty_ppm, field.id, field.value)
            if not field.key in res:
                res[field.key] = tup
            elif res[field.key] < tup:
                res[field.key] = tup
        t2 = time.time()
        simplified = {}
        for key, tup in res.iteritems():
            simplified[key] = tup[-1]
        t3 = time.time()
        models_times["fetch-fields-fetch"] += t1-t0
        models_times["fetch-fields-singlify"] += t2-t1
        models_times["fetch-fields-simplify"] += t3-t2
        return simplified
    def create_dict_json(self):
        t0 = time.time()
        d = self.field_dict()
        t1 = time.time()
        obj = {
            "xref": self.xref,
            "tag": self.tag,
            "name": d.get("Full Name", None),
            "sex": d.get("Sex", None),
            "birth_date_string": d.get("Date of Birth", None),
            "birth_date_year": d.get("Year of Birth", None),
#            "birth_date": self.birth_date,
            "death_date_string": d.get("Date of Death", None),
            "death_date_year": d.get("Year of Death", None),
#            "death_date": self.death_date,
            "sub_families": [x.xref for x in self.sub_families],
            "sup_families": [x.xref for x in self.sup_families],
            "soundex_family": d.get("Family Name Soundex", None),
        }
        t2 = time.time()
        self.dict_json = json.dumps(obj)
        t3 = time.time()
        models_times["fetch-fields"] += t1-t0
        models_times["create-obj"] += t2-t1
        models_times["json-dump"] += t3-t2
    def as_dict(self):
        return json.loads(self.dict_json)
    def add_attribute(self, key, value, certainty):
        indfield = IndividualField(
                key = key,
                value = value,
                certainty_ppm = int(certainty * 1000000),
                individual = self,
                )
        session.add(indfield)
        return indfield

class IndividualField(Base):
    __tablename__ = "individual_field"
    id = Column(Integer, primary_key=True)
    key = Column(String(128))
    value = Column(UnicodeText)
    certainty_ppm = Column(Integer)

    individual_id = Column(Integer, ForeignKey("individual.id"))
    # implied from Individual
    individual = relationship("Individual",
            primaryjoin = Individual.id == individual_id,
            lazy = "joined",
            )

class Family(Base):
    __tablename__ = "family"
    id = Column(Integer, primary_key=True)
    xref = Column(Unicode(16), index=True, unique=True)
    tag = Column(Unicode(4))

    loaded_gedcom = Column(UnicodeText)

    parents = relationship("Individual",
            secondary = family_parent_link,
            backref = "sub_families")
    children = relationship("Individual",
            secondary = family_child_link,
            backref = "sup_families")

    def as_dict(self):
        return {
            "xref": self.xref,
            "tag": self.tag,
            "parents": [x.xref for x in self.parents],
            "children": [x.xref for x in self.children],
        }

class Setting(Base):
    __tablename__ = "setting"
    id = Column(Integer, primary_key=True)
    key = Column(String(32), index=True, unique=True)
    value = Column(UnicodeText)



class Comment(Base):
    __tablename__ = "comment"
    id = Column(Integer, primary_key=True)
    # todo: proper foreignkey
    xref = Column(Unicode(16))
    author_name = Column(Unicode(64))
    author_email = Column(Unicode(256))
    author_ip_address = Column(String(48))
    content = Column(UnicodeText)
    comment_type = Column(Unicode(32))
    written_on = Column(DateTime)
    def as_dict(self):
        return {
            "xref": self.xref,
            "author": self.author_name,
            "content": self.content,
            "type": self.comment_type,
            "isodate": self.written_on.isoformat(),
        }

