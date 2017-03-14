# -*- coding: utf-8 -*-

import re
#from .models import NormalizedFirstName, NormalizedLastName
from .models import *

def ensure_unicode(s):
    if isinstance(s, unicode):
        return s
    if isinstance(s, str):
        return s.decode("utf8")
    return unicode(s)
u = ensure_unicode

def _is_vowel(c):
    return c in u'aeiouyäö'

def _clean_name_token(token, clean_strong=1):
    if token is None:
        return ""
    token = token.split('\K')[0].lower().strip()
    if clean_strong >= 1:
        token = re.sub(u'[^a-zåäöé ]', '', token)
        token = token.strip()
        token = re.sub(u'c', u'k', token)
        token = re.sub(u'å', u'o', token)
        token = re.sub(u'w', u'v', token)
        token = re.sub(u'é', u'e', token)
    if clean_strong >= 2:
        token = re.sub(u'io', u'jo', token)
        token = re.sub(u'iö', u'jö', token)
        token = re.sub(u'ph', u'ff', token)
        if token.endswith(u'nen'):
            token = token[:-2]
        if token.endswith(u'in') and len(token) > 3 and _is_vowel(token[-3]):
            token = token[:-2] + u'n'
    return token

def normalize_name(name, is_first, name_dict=None):
    if is_first:
        name = _clean_name_token(name, 1)
        Normalizer = NormalizedFirstName
    else:
        name = _clean_name_token(name, 2)
        Normalizer = NormalizedLastName
    if name_dict is not None:
        if name in name_dict:
            return name_dict[name]
        else:
            return name
    else:
        res = Normalizer.query.filter_by(raw_name = name).first()
        if res:
            return res.norm_name
        else:
            return name

def get_family_xref(ind, neigh):
    print "Looking for a shared family."
    sup_families1 = []
    for fam in ind.sup_families:
        sup_families1.append(fam.xref)
    sub_families2 = []
    for fam in neigh.sub_families:
        sub_families2.append(fam.xref)
    for id1 in sup_families1:
        for id2 in sub_families2:
            if id1 == id2:
                return id1
    sup_families2 = []
    for fam in neigh.sup_families:
        sup_families2.append(fam.xref)
    sub_families1 = []
    for fam in ind.sub_families:
        sub_families1.append(fam.xref)
    for id1 in sup_families2:
        for id2 in sub_families1:
            if id1 == id2:
                return id1
    print "Shared family not found for {} and {}.".format(ind.xref, neigh.xref)
    return False
