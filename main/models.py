
from sqlalchemy import *
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

