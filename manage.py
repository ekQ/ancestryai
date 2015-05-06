import sys,os

if len(sys.argv) < 2:
    print """python {} <command> [sub commands / options]

commands
     |  subcommands
     |   |
     V   V
    run           - runs the server
        debug       - has the debug mode on while running
        open        - open for connections from outside localhost
    db            - database related commands
        delete      - deletes the current database
        create      - creates an empty database
        export      - exports database into data.json
        import      - imports database data from data.json
        fixture     - imports database data from fixture.json
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
        from nirflaskaid import fixturetools
        fixturetools.import_file("data.json")
        print "* database imported"
    if "fixture" in subs:
        from nirflaskaid import fixturetools
        fixturetools.import_file("fixture.json")
        print "* fixture imported"
    if "export" in subs:
        from nirflaskaid import fixturetools
        fixturetools.export_file("data.json")
        print "* database exported"


