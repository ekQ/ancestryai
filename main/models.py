
import json
from sqlalchemy import *
from sqlalchemy.orm import *
from main.database import Base, session
from pbkdf2 import crypt

class User(Base):
    # this is not really used in any way, as the site doesn't have a login feature
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

class Parish(Base):
    __tablename__ = "parish"
    id = Column(Integer, primary_key=True)
    lat = Column(Float)
    lon = Column(Float)
    def as_dict(self):
        return {
            "type": "parish",
            "id": self.id,
            "lat": self.lat,
            "lon": self.lon,
        }

class Village(Base):
    __tablename__ = "village"
    id = Column(Integer, primary_key=True)
    lat = Column(Float)
    lon = Column(Float)
    def as_dict(self):
        return {
            "type": "village",
            "id": self.id,
            "lat": self.lat,
            "lon": self.lon,
        }

class Individual(Base):
    __tablename__ = "individual"
    id = Column(Integer, primary_key=True)
    xref = Column(Unicode(16), index=True, unique=True)
    tag = Column(Unicode(4))
    name = Column(Unicode(256))
    name_first = Column(Unicode(128))
    name_family = Column(Unicode(128))
    sex = Column(Unicode(1))
    birth_date_string = Column(Unicode(64))
    birth_date_year = Column(Integer)
    birth_date = Column(Date)
    death_date_string = Column(Unicode(64))
    death_date_year = Column(Integer)
    death_date = Column(Date)
    component_id = Column(Integer)

    parish_id = Column(Integer, ForeignKey("parish.id"))
    parish = relationship("Parish", backref="individuals")

    village_id = Column(Integer, ForeignKey("village.id"))
    village = relationship("Village", backref="individuals")

    soundex_first = Column(Unicode(16))
    soundex_family = Column(Unicode(16))

    pre_dicted = Column(UnicodeText)
    neighboring_ids = Column(UnicodeText)

    loaded_gedcom = Column(UnicodeText)
    def as_dict(self):
        if self.pre_dicted:
            d = json.loads(self.pre_dicted)
            # because at least currently this is calculated after the pre dicting
            d["component_id"] = self.component_id
            return d
        location = {"lat": None, "lon": None, "type": "none"}
        if self.village:
            location = self.village.as_dict()
        elif self.parish:
            location = self.parish.as_dict()
        return {
            "xref": self.xref,
            "name": self.name,
            "name_first": self.name_first,
            "name_family": self.name_family,
            "tag": self.tag,
            "sex": self.sex,
            "birth_date_string": self.birth_date_string,
            "birth_date_year": self.birth_date_year,
            "birth_date": self.birth_date,
            "death_date_string": self.death_date_string,
            "death_date_year": self.death_date_year,
            "death_date": self.death_date,
            "sub_families": [x.xref for x in self.sub_families],
            "sup_families": [x.xref for x in self.sup_families],
            "soundex_family": self.soundex_family,
            "parent_probabilities": [{"xref": x.parent.xref, "name": x.parent.name, "prob": x.probability} for x in self.parent_probabilities],
            "location": location,
        }

class ParentProbability(Base):
    __tablename__ = "parent_probability"
    id = Column(Integer, primary_key=True)
    person_id = Column(Integer, ForeignKey("individual.id"))
    person = relationship("Individual",
            foreign_keys = "ParentProbability.person_id",
            backref = "parent_probabilities",
            )
    parent_id = Column(Integer, ForeignKey("individual.id"))
    parent = relationship("Individual",
            foreign_keys = "ParentProbability.parent_id",
            backref = "child_probabilities",
            )
    probability = Column(Float)

class Family(Base):
    __tablename__ = "family"
    id = Column(Integer, primary_key=True)
    xref = Column(Unicode(16), index=True, unique=True)
    tag = Column(Unicode(4))
    component_id = Column(Integer)

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

