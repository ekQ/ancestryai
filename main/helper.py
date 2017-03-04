def ensure_unicode(s):
    if isinstance(s, unicode):
        return s
    if isinstance(s, str):
        return s.decode("utf8")
    return unicode(s)
u = ensure_unicode
