import importlib
try:
    import os, sys
    proj_root = os.getcwd()
    # Ensure project root is on sys.path so top-level packages (api, core, utils) import correctly
    if proj_root not in sys.path:
        sys.path.insert(0, proj_root)
    print('CWD:', proj_root)
    print('sys.path[0]:', sys.path[0])
    print('listing root files:', os.listdir(proj_root))
    importlib.import_module('api.jira_clients')
    print('IMPORT_OK')
except Exception as e:
    print('IMPORT_FAIL')
    import traceback
    traceback.print_exc()
