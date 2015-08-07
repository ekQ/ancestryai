
import json
import textwrap
from .models import *
from .database import session

def printcomment(comment):
    print "-"*79
    print "id {:5} for {:10} about {:10} at {}".format(
            str(comment.id),
            comment.xref,
            comment.comment_type,
            comment.written_on,
            )
    print "by {:20} {:30} from {:15}".format(
            '"'+comment.author_name+'"',
            "<"+comment.author_email+">",
            comment.author_ip_address,
            )
    print "\n".join(textwrap.wrap(comment.content, 79))

def handlecommands(subs):
    for i, sub in enumerate(subs):
        if sub == "printall":
            for comment in Comment.query.order_by(Comment.xref).all():
                printcomment(comment)
        if sub == "export":
            per_xref = {}
            for comment in Comment.query.all():
                if comment.xref not in per_xref:
                    per_xref[comment.xref] = []
                per_xref[comment.xref].append(comment.as_privileged_dict())
            print json.dumps(per_xref, indent=4)
        if sub == "print":
            cid = subs[i+1]
            comment = Comment.query.filter_by(id = cid).first()
            if comment:
                printcomment(comment)
            else:
                print "no such comment id = {}".format(cid)
        if sub == "delete":
            cid = subs[i+1]
            comment = Comment.query.filter_by(id = cid).first()
            if comment:
                session.delete(comment)
                session.commit()
            else:
                print "no such comment id = {}".format(cid)
