# -*- coding: utf-8 -*-
"""
Created on Fri Feb 28 17:50:54 2014

@author: emalmi
"""
import sqlalchemy
from sqlalchemy import func
from elixir import *
from scipy.stats import norm

data_dir = "../../parse"

a_engine = sqlalchemy.create_engine('sqlite:///%s/data_indexed.sqlite3' % data_dir, echo=False)
a_session = sqlalchemy.orm.scoped_session(sqlalchemy.orm.sessionmaker(autoflush=True, bind=a_engine))
a_metadata = metadata
a_metadata.bind = a_engine

b_engine = sqlalchemy.create_engine('sqlite:///%s/srkdata.sqlite3' % data_dir, echo=False)
b_session = sqlalchemy.orm.scoped_session(sqlalchemy.orm.sessionmaker(autoflush=True, bind=b_engine))
b_metadata = sqlalchemy.ThreadLocalMetaData()
b_metadata.bind = b_engine

def clean_name_token(token):
    return token.split('\K')[0].lower().strip()

class Person(Entity):
    using_options(metadata=a_metadata, session=a_session, tablename='kastetut', autoload=True, allowcoloverride=True)
    id = Field(Integer, colname="TAPAHTUMAID", primary_key=True)

    name = Field(String, colname="LNIMI")
    
    # Birth date
    year = Field(Integer, colname="SYNVU")
    month = Field(Integer, colname="SYNKK")
    day = Field(Integer, colname="SYNPV")
    # Baptism date
    byear = Field(Integer, colname="KASVU")
    bmonth = Field(Integer, colname="KASKK")
    bday = Field(Integer, colname="KASPV")
    
    village_id = Field(Integer, colname="KYLAID")
    parish_id = Field(Integer, colname="SRKID")
    dad_first_name = Field(String, colname="IETUN")
    dad_last_name = Field(String, colname="ISUKUN")
    dad_patronymic = Field(String, colname="IPATR")
    mom_first_name = Field(String, colname="AETUN")
    mom_last_name = Field(String, colname="ASUKUN")
    mom_patronymic = Field(String, colname="APATR")
    mom_age = Field(String, colname="AIKA")
    
    def __init__(self):
        self.first_name = clean_name_token(self.name)
        if len(self.first_name) > 0:
            self.first_first_name = self.first_name.split()[0]
        else:
            self.first_first_name = ''
        self.last_name = clean_name_token(self.dad_last_name)
        self.clean_name = self.first_first_name + ' ' + last_name

    def clean_name(self, first_name, last_name, patronymic=None):
        first_name = clean_name_token(first_name)
        #if len(first_name) > 0:
        #    first_name = first_name.split()[0]
        last_name = clean_name_token(last_name)
        if patronymic is None:
            return first_name + ' ' + last_name
        else:
            patronymic = clean_name_token(patronymic)
            return first_name + ' ' + patronymic + ' ' + last_name
        
    def get_clean_name(self):
        return self.clean_name(self.name, self.dad_last_name)

    def get_clean_first_name(self):
        return clean_name_token(self.name)

    def get_clean_dad_name(self):
        return self.clean_name(self.dad_first_name, self.dad_last_name)
        
    def get_clean_mom_name(self):
        return self.clean_name(self.mom_first_name, self.mom_last_name)
        
    def get_label(self):
        return self.get_clean_name() + ' ' + str(self.year)
        
    def get_parenthood_probability(self, child, is_father):
        '''
        Estimate the probability that this person (self) is the father/mother
        of the given child (Person).
        '''
        age = child.year - self.year
        p_age = -1
        if not is_father:
            try:
                mom_age = int(child.mom_age)
                if mom_age >= 14 and mom_age <= 60:
                    p_age = norm.pdf(age,loc=mom_age,scale=2)
            except:
                pass
        if p_age == -1:
            p_age = norm.pdf(age,loc=25,scale=3)/3.0 \
                  + norm.pdf(age,loc=35,scale=5)/3.0 \
                  + norm.pdf(age,loc=30,scale=5)/3.0
                  
        if self.village_id == child.village_id:
            p_village = 0.7
        else:
            p_village = 0.3
        return p_age * p_village
    
class Village(Entity):
    using_options(metadata=b_metadata, session=b_session, tablename='kylat', autoload=True, allowcoloverride=True)
    id = Field(Integer, colname="id", primary_key=True)
    parish_id = Field(Integer, colname="seurakunta")
    name = Field(String, colname="kyla")

class Parish(Entity):
    using_options(metadata=b_metadata, session=b_session, tablename='seurakunnat', autoload=True, allowcoloverride=True)
    id = Field(Integer, colname="id", primary_key=True)
    name = Field(String, colname="namefi")
    lon = Field(Float, colname="lon")
    lat = Field(Float, colname="lat")
    
setup_all()
