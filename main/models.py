
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

    soundex6first = Column(Unicode(6))
    soundex6family = Column(Unicode(6))
    soundex3first = Column(Unicode(3))
    soundex3family = Column(Unicode(3))
    def as_dict(self):
        return {
            "xref": self.xref,
            "name": self.name,
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
        }

class Family(Base):
    __tablename__ = "family"
    id = Column(Integer, primary_key=True)
    xref = Column(Unicode(16), index=True, unique=True)
    tag = Column(Unicode(4))

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

