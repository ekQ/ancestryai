import sys,os

if len(sys.argv) < 2:
    print """python {} <command> [sub commands / options]

commands
     |  subcommands
     |   |
     V   V
    run               - runs the server
        debug           - has the debug mode on while running
        open            - open for connections from outside localhost
    db                - database related commands
        delete          - deletes the current database
        create          - creates an empty database
        export          - exports database into data.json
        import          - imports database data from data.json
        fixture         - imports database data from fixture.json
    populate          - populate database entries from a source
        gedcom <fname>  - populate from a gedcom file
        store-gedcom    - store full gedcom data for nodes in database. Useful
                          if writing out is desired later on.
        recons <fname>  - populate from a recons file, where the given file is
                          a header file.
        components      - populate connected components for people path search
    write             - write gedcom out from the database
        reform          - reform the gedcom data in database
        gedcom <fname>  - write the gedcom data to the given file
""".format(sys.argv[0])
    sys.exit(0)

command = sys.argv[1]
subs = sys.argv[2:]

if command == "run":
    import main
    debug = "debug" in subs
    if "open" in subs:
        main.app.run(debug=debug, host="0.0.0.0", port=8081, threaded=True)
    else:
        main.app.run(debug=debug, port=8081, threaded=True)
if command == "db":
    import main
    import config
    from main import database
    if "delete" in subs:
        os.remove(config.DB_URI.replace("sqlite:///", ""))
        print "* database removed"
    if "create" in subs:
        database.manage_create()
        print "* database created"
    if "import" in subs:
        from flaskaid import fixturetools
        fixturetools.import_file("data.json")
        print "* database imported"
    if "fixture" in subs:
        from flaskaid import fixturetools
        fixturetools.import_file("fixture.json")
        print "* fixture imported"
    if "export" in subs:
        from flaskaid import fixturetools
        fixturetools.export_file("data.json")
        print "* database exported"
if command == "populate":
    import main
    from main.populate import populate_from_gedcom, populate_from_recons, populate_component_ids
    for i,sub in enumerate(subs):
        if sub == "gedcom":
            fname = subs[i+1]
            populate_from_gedcom(fname, "store-gedcom" in subs)
        if sub == "recons":
            fname = subs[i+1]
            populate_from_recons(fname)
        if sub == "components":
            populate_component_ids()
if command == "write":
    import main
    from main.populate import reform_gedcom
    from main.models import *
    if "reform" in subs:
        reform_gedcom()
    for i,sub in enumerate(subs):
        if sub == "gedcom":
            fname = subs[i+1]
            f = open(fname, "w")
            for ind in Individual.query.all():
                f.write(ind.loaded_gedcom)
            for fam in Family.query.all():
                f.write(fam.loaded_gedcom)
            f.close()
