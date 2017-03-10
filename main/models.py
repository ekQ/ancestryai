
import json
from sqlalchemy import *
from sqlalchemy.orm import *
from main.database import Base, session
from pbkdf2 import crypt
from helper import *
import time

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
    Column("individual_id", Integer, ForeignKey("individual.id"), primary_key=True),
    Column("family_id", Integer, ForeignKey("family.id"), primary_key=True),
)
family_child_link = Table("family_child_link", Base.metadata,
    Column("individual_id", Integer, ForeignKey("individual.id"), primary_key=True),
    Column("family_id", Integer, ForeignKey("family.id"), primary_key=True),
)

class FamilyParentLink(Base):
    __table__ = family_parent_link

class FamilyChildLink(Base):
    __table__ = family_child_link

class Parish(Base):
    __tablename__ = "parish"
    id = Column(Integer, primary_key=True)
    name = Column(Unicode(256))
    lat = Column(Float)
    lon = Column(Float)
    def as_dict(self):
        return {
            "type": "parish",
            "name": self.name,
            "id": self.id,
            "lat": self.lat,
            "lon": self.lon,
        }

class Village(Base):
    __tablename__ = "village"
    id = Column(Integer, primary_key=True)
    name = Column(Unicode(256))
    lat = Column(Float)
    lon = Column(Float)
    def as_dict(self):
        return {
            "type": "village",
            "name": self.name,
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
    normalized_name_first = Column(Unicode(128), index=True)
    normalized_name_family = Column(Unicode(128), index=True)
    dad_first = Column(Unicode(128))
    dad_family = Column(Unicode(128))
    dad_patronym = Column(Unicode(64))
    mom_first = Column(Unicode(128))
    mom_family = Column(Unicode(128))
    mom_patronym = Column(Unicode(64))
    sex = Column(Unicode(1))
    birth_date_string = Column(Unicode(64))
    birth_date_year = Column(Integer, index=True)
    birth_date = Column(Date)
    death_date_string = Column(Unicode(64))
    death_date_year = Column(Integer)
    death_date = Column(Date)
    component_id = Column(Integer, index=True)
    is_celebrity = Column(Boolean, index=True)

    parish_id = Column(Integer, ForeignKey("parish.id"), index=True)
    parish = relationship("Parish", backref="individuals")

    village_id = Column(Integer, ForeignKey("village.id"))
    village = relationship("Village", backref="individuals")

    soundex_first = Column(Unicode(16), index=True)
    soundex_family = Column(Unicode(16), index=True)

    pre_dicted = Column(UnicodeText)
    neighboring_ids = Column(UnicodeText)

    # sup_family from Family
    # sub_family from Family

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
        t0 = time.time()
        ret = {
            "xref": self.xref,
            "name": self.name,
            "name_first": self.name_first,
            "name_family": self.name_family,
            "dad_first": self.dad_first,
            "dad_family": self.dad_family,
            "dad_patronym": self.dad_patronym,
            "mom_first": self.mom_first,
            "mom_family": self.mom_family,
            "mom_patronym": self.mom_patronym,
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
            "parent_probabilities": [{
                    "xref": x.parent.xref,
                    "name": x.parent.name,
                    "prob": x.probability,
                    "is_dad": x.is_dad,
                } for x in self.parent_probabilities],
            "location": location,
        }
        #print "Dicting {} took {} seconds ({}, {}, {}).".format(self.xref, time.time()-t0, len(ret["sub_families"]), len(ret["sup_families"]), len(ret["parent_probabilities"]))
        return ret

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
    is_dad = Column(Boolean)
    is_selected = Column(Boolean)
    probability = Column(Float)

class Family(Base):
    __tablename__ = "family"
    id = Column(Integer, primary_key=True)
    xref = Column(Unicode(16), index=True, unique=True)
    tag = Column(Unicode(4))
    component_id = Column(Integer)

    pre_dicted = Column(UnicodeText)

    loaded_gedcom = Column(UnicodeText)

    parents = relationship("Individual",
            secondary = family_parent_link,
            backref = "sub_families")
    children = relationship("Individual",
            secondary = family_child_link,
            backref = "sup_families")

    def as_dict(self):
        t0 = time.time()
        if self.pre_dicted:
            d = json.loads(self.pre_dicted)
            return d
        else:
            ret = {
                "xref": self.xref,
                "tag": self.tag,
                "parents": [x.xref for x in self.parents],
                "children": [x.xref for x in self.children],
            }
            #print "\tDicting family {} took {} seconds ({}, {}).".format(
            #        self.xref, time.time()-t0, len(ret["parents"]), len(ret["children"]))
            return ret

class Setting(Base):
    __tablename__ = "setting"
    id = Column(Integer, primary_key=True)
    key = Column(String(32), index=True, unique=True)
    value = Column(UnicodeText)

class NormalizedFirstName(Base):
    __tablename__ = "normalized_fname"
    id = Column(Integer, primary_key=True)
    raw_name = Column(Unicode(64), index=True, unique=True)
    norm_name = Column(Unicode(64))

class NormalizedLastName(Base):
    __tablename__ = "normalized_lname"
    id = Column(Integer, primary_key=True)
    raw_name = Column(Unicode(64), index=True, unique=True)
    norm_name = Column(Unicode(64))



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
    def as_privileged_dict(self):
        d = self.as_dict()
        d.update({
            "email": self.author_email,
            "ip": self.author_ip_address,
            "id": self.id,
        })
        return d
