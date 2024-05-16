const $ = require('atom-space-pen-views').$;
const fs = require('fs-plus');
const path = require("path");
const PulsarSync = require("./lib/PulsarSync");
const CompositeDisposable = require('atom').CompositeDisposable;

let projectDict = null;
let disposables = null;

const getEventPath = function(e) {
    let target = $(e.target).closest('.file, .directory, .tab')[0];
    if (target == null) {
        target = atom.workspace.getActiveTextEditor();
    }
    const fullPath = target != null ? typeof target.getPath === "function" ? target.getPath() : void 0 : void 0;
    if (!fullPath) {
        return [];
    }
    const ref = atom.project.relativizePath(fullPath);
    const projectPath = ref[0];
    const relativePath = ref[1];
    return [projectPath, fullPath];
};

const initProject = function(projectPaths) {
    let disposes, err, i, j, len, len1, obj, projectPath, results;
    disposes = [];
    for (projectPath in projectDict) {
        if (projectPaths.indexOf(projectPath) === -1) {
            disposes.push(projectPath);
        }
    }
    for (i = 0, len = disposes.length; i < len; i++) {
        projectPath = disposes[i];
        projectDict[projectPath].dispose();
        delete projectDict[projectPath];
    }
    results = [];
    for (j = 0, len1 = projectPaths.length; j < len1; j++) {
        projectPath = projectPaths[j];
        try {
            projectPath = fs.realpathSync(projectPath);
        } catch (error) {
            err = error;
            continue;
        }
        if (projectDict[projectPath]) {
            continue;
        }
        obj = PulsarSync.create(projectPath);
        if (obj) {
            results.push(projectDict[projectPath] = obj);
        } else {
            results.push(void 0);
        }
    }
    return results;
};

const handleEvent = function(e, cmd) {
    const eventPath = getEventPath(e);
    const projectPath = eventPath[0];
    if (!projectPath) {
        return;
    }
    const fullPath = eventPath[1];
    const projectObj = projectDict[fs.realpathSync(projectPath)];
    return typeof projectObj[cmd] === "function" ? projectObj[cmd](fs.realpathSync(fullPath)) : void 0;
};

const reload = function(projectPath) {
    if (projectDict[projectPath] !== null) {
        projectDict[projectPath].dispose();
    }
    return projectDict[projectPath] = PulsarSync.create(projectPath);
};

const configure = function(e) {
    let projectPath = getEventPath(e)[0];
    if (!projectPath) {
        return;
    }
    projectPath = fs.realpathSync(projectPath);
    return PulsarSync.configure(projectPath, function() {
        return reload(projectPath);
    });
};

module.exports = {
    config: {
        logToConsole: {
            type: 'boolean',
            "default": false,
            title: 'Log to console',
            description: 'Log messages to the console instead of the status view at the bottom of the window'
        },
        logToAtomNotifications: {
            type: 'boolean',
            "default": false,
            title: 'Use Atom Notifications',
            description: 'Show log messages using Atom notifications'
        },
        autoHideLogPanel: {
            type: 'boolean',
            "default": false,
            title: 'Hide log panel after transferring',
            description: 'Hides the status view at the bottom of the window after the transfer operation is done'
        },
        foldLogPanel: {
            type: 'boolean',
            "default": false,
            title: 'Fold log panel by default',
            description: 'Shows only one line in the status view'
        },
        monitorFileAnimation: {
            type: 'boolean',
            "default": true,
            title: 'Monitor file animation',
            description: 'Toggles the pulse animation for a monitored file'
        },
        configFileName: {
            type: 'string',
            "default": '.sync.json'
        },
        concurrentTransports: {
            type: 'integer',
            "default": '1',
            description: 'How many transfers in process at the same time'
        },
    },
    activate: function(state) {
        projectDict = {};
        try {
            initProject(atom.project.getPaths());
        } catch (error) {
            atom.notifications.addError("PulsarSync Error", {
                dismissable: true,
                detail: "Failed to initalise PulsarSync. " + error
            });
        }

        disposables = new CompositeDisposable;
        disposables.add(atom.commands.add('atom-workspace', {
            'pulsar-sync:upload-folder': function(e) {
                return handleEvent(e, "uploadFolder");
            },
            'pulsar-sync:upload-file': function(e) {
                return handleEvent(e, "uploadFile");
            },
            'pulsar-sync:delete-file': function(e) {
                return handleEvent(e, "deleteFile");
            },
            'pulsar-sync:delete-folder': function(e) {
                return handleEvent(e, "deleteFile");
            },
            'pulsar-sync:download-file': function(e) {
                return handleEvent(e, "downloadFile");
            },
            'pulsar-sync:download-folder': function(e) {
                return handleEvent(e, "downloadFolder");
            },
            'pulsar-sync:upload-git-change': function(e) {
                return handleEvent(e, "uploadGitChange");
            },
            'pulsar-sync:monitor-file': function(e) {
                return handleEvent(e, "monitorFile");
            },
            'pulsar-sync:monitor-files-list': function(e) {
                return handleEvent(e, "monitorFilesList");
            },
            'pulsar-sync:configure': configure
        }));
        disposables.add(atom.project.onDidChangePaths(function(projectPaths) {
            return initProject(projectPaths);
        }));
        return disposables.add(atom.workspace.observeTextEditors(function(editor) {
            let onDidDestroy, onDidSave;
            onDidSave = editor.onDidSave(function(e) {
                let fullPath, projectObj, projectPath, ref, relativePath;
                fullPath = e.path;
                ref = atom.project.relativizePath(fullPath), projectPath = ref[0], relativePath = ref[1];
                if (!projectPath) {
                    return;
                }
                projectPath = fs.realpathSync(projectPath);
                projectObj = projectDict[projectPath];
                if (!projectObj) {
                    return;
                }
                if (fs.realpathSync(fullPath) === fs.realpathSync(projectObj.configPath)) {
                    projectObj = reload(projectPath);
                }
                if (!projectObj.host.uploadOnSave) {
                    return;
                }
                return projectObj.uploadFile(fs.realpathSync(fullPath));
            });
            onDidDestroy = editor.onDidDestroy(function() {
                disposables.remove(onDidSave);
                disposables.remove(onDidDestroy);
                onDidDestroy.dispose();
                return onDidSave.dispose();
            });
            disposables.add(onDidSave);
            return disposables.add(onDidDestroy);
        }));
    },
    deactivate: function() {
        let obj, projectPath;
        disposables.dispose();
        disposables = null;
        for (projectPath in projectDict) {
            obj = projectDict[projectPath];
            obj.dispose();
        }
        projectDict = null;
        return;
    }
};
