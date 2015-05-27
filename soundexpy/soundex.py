# -*- coding: utf-8 -*-

# http://en.wikipedia.org/wiki/Soundex
# the algorithm is actually for english, but it might do something anyway

soundex_init = [
    (u"aeiouyöäå",  -1),  # remove and cut duplicate removal
    ("hw",          -2),  # remove
    ("bfpv",        1),
    ("cgjkqsxz",    2),
    ("dt",          3),
    ("l",           4),
    ("mn",          5),
    ("r",           6),
]
soundex_table = {
    letter: value
    for group, value in soundex_init
    for letter in group
}
def soundex_lookup(ch):
    if not ch.lower() in soundex_table:
        return -3
    return soundex_table[ch.lower()]


def soundex(s, length=0):
    """
    Calculates soundex encoding for the given string
    http://en.wikipedia.org/wiki/Soundex

    length is the length of the resulting encoding. 0 means no limit and
    negative means to remove that many characters from the end of the
    non-limited encoding.
    """
    if not s:
        return "?" + "0"*(length-1)
    encoded = s[0]
    lastch = soundex_lookup(s[0])
    for ch in s[1:]:
        enc = soundex_lookup(ch)
        if enc == lastch:
            continue
        if enc == -3:
            continue
        if enc == -2:
            continue
        lastch = enc
        if enc == -1:
            continue
        encoded += str(enc)
        if len(encoded) == length:
            return encoded
    while len(encoded) < length:
        encoded += "0"
    if length < 0:
        return encoded[0] + encoded[1:length]
    return encoded

fail_count = 0
def debug_test(s, code=None, length=0):
    global fail_count
    enc = soundex(s, length)
    result = "" if code == None else ("ok" if enc == code else "fail!")
    print u"{:16} :{:2}: {:8} <> {:8} -- {}".format(s, length if length != 0 else " -", code, enc, result)
    if enc != code and code != None:
        fail_count += 1

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print "python {} test".format(sys.argv[0])
        print "python {} <name>".format(sys.argv[0])
        sys.exit()
    if sys.argv[1] == "test":
        print "{:16} {:4} {:8}    {:8}    {}".format("string", "len", "expect", "result", "status")
        print "-"*55
        debug_test("Foobar", "F16")
        debug_test("Foobar", "F16000", 6)
        debug_test("Foobbar", "F16")
        debug_test("Foobhbar", "F16")
        debug_test("Foobobar", "F116")
        debug_test("Fffoobar", "F16")
        debug_test("Tymczak", "T522")
        debug_test("Pfister", "P236")
        debug_test("Ashcraft", "A261", 4)
        debug_test("Ashcroft", "A261", 4)
        debug_test("Ashcroft", "A2613")
        debug_test("Ashcroft", "A261", -1)
        debug_test("Ashcroft", "A26", -2)
        debug_test("Ashcroft", "A", -4)
        debug_test("Ashcroft", "A", -5)
        debug_test("White", "W300", 4)
        debug_test(u"Mömmö", "M5")
        print "-"*55
        print "all tests ok" if fail_count == 0 else "{} tests failed".format(fail_count)
    else:
        print soundex(sys.argv[1])


