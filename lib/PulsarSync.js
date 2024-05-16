const path = require("path");
const fs = require("fs-plus");
const chokidar = require("chokidar");
const minimatch = require("minimatch");
const EventEmitter = require("events").EventEmitter;

const Logger = require("./Logger");
const Host = require('./model/host');
const HostView = require('./view/host-view');
const UploadListener = require("./UploadListener");
const DownloadCmd = require('./commands/DownloadAllCommand');

const ScpTransport = require("./transports/ScpTransport");
const FtpTransport = require("./transports/FtpTransport");

const indexOf =
(typeof([].indexOf) === 'function') ?
    [].indexOf :
    function(item) { for (let i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

    let uploadCmd = null;
    let MonitoredFiles = [];
    let watchFiles = {};
    let watchChangeSet = false;
    let watcher = chokidar.watch();
    let logger = null;

    const getLogger = function() {
        if (!logger) {
            logger = new Logger("PulsarSync Log");
        }
        return logger;
    };

    const PulsarSync = (function() {
        function PulsarSync(projectPath1, configPath1) {
            let ref;
            this.projectPath = projectPath1;
            this.configPath = configPath1;
            this.host = new Host(this.configPath, getLogger());
            watchFiles = (ref = this.host.watch) != null ? ref.split(",").filter(Boolean) : void 0;
            if (this.host.source) {
                this.projectPath = path.join(this.projectPath, this.host.source);
            }
            if (watchFiles != null) {
                this.initAutoFileWatch(this.projectPath);
            }
            this.initIgnore(this.host);
            this.initMonitor();
        }

        PulsarSync.prototype.initIgnore = function(host) {
            let ignore, ref;
            ignore = (ref = host.ignore) != null ? ref.split(",") : void 0;
            return host.isIgnore = (function(_this) {
                return function(filePath, relativizePath) {
                    let i, len, pattern;
                    if (!(relativizePath || _this.inPath(_this.projectPath, filePath))) {
                        return true;
                    }
                    if (!ignore) {
                        return false;
                    }
                    if (!relativizePath) {
                        relativizePath = _this.projectPath;
                    }
                    filePath = path.relative(relativizePath, filePath);

                    for (i = 0, len = ignore.length; i < len; i++) {
                        pattern = ignore[i];
                        if (minimatch(filePath, pattern, {
                            matchBase: true,
                            dot: true
                        })) {
                            return true;
                        }
                    }
                    return false;
                };
            })(this);
        };

        PulsarSync.prototype.isIgnore = function(filePath, relativizePath) {
            return this.host.isIgnore(filePath, relativizePath);
        };

        PulsarSync.prototype.inPath = function(rootPath, localPath) {
            if (fs.isDirectorySync(localPath)) {
                localPath = localPath + path.sep;
            }
            return localPath.indexOf(rootPath + path.sep) === 0;
        };

        PulsarSync.prototype.dispose = function() {
            if (this.transport) {
                this.transport.dispose();
                return this.transport = null;
            }
        };

        PulsarSync.prototype.deleteFile = function(filePath) {
            let i, len, ref, t;
            if (this.isIgnore(filePath)) {
                return;
            }
            if (!uploadCmd) {
                uploadCmd = new UploadListener(getLogger());
            }
            uploadCmd.handleDelete(filePath, this.getTransport());
            ref = this.getUploadMirrors();
            for (i = 0, len = ref.length; i < len; i++) {
                t = ref[i];
                uploadCmd.handleDelete(filePath, t);
            }
            if (this.host.deleteLocal) {
                return fs.removeSync(filePath);
            }
        };

        PulsarSync.prototype.downloadFolder = function(localPath, targetPath, callback) {

            return DownloadCmd.run(getLogger(), this.getTransport(), localPath, targetPath, callback);
        };

        PulsarSync.prototype.downloadFile = function(localPath) {
            let realPath;
            if (this.isIgnore(localPath)) {
                return;
            }
            realPath = path.relative(this.projectPath, localPath);
            realPath = path.join(this.host.target, realPath).replace(/\\/g, "/");
            return this.getTransport().download(realPath);
        };

        PulsarSync.prototype.uploadFile = function(filePath) {
            let e, i, j, len, len1, ref, ref1, results, t;
            if (this.isIgnore(filePath)) {
                return;
            }
            if (!uploadCmd) {
                uploadCmd = new UploadListener(getLogger());
            }
            if (this.host.saveOnUpload) {
                ref = atom.workspace.getTextEditors();
                for (i = 0, len = ref.length; i < len; i++) {
                    e = ref[i];
                    if (e.getPath() === filePath && e.isModified()) {
                        e.save();
                        if (this.host.uploadOnSave) {
                            return;
                        }
                    }
                }
            }
            uploadCmd.handleSave(filePath, this.getTransport());
            ref1 = this.getUploadMirrors();
            results = [];
            for (j = 0, len1 = ref1.length; j < len1; j++) {
                t = ref1[j];
                results.push(uploadCmd.handleSave(filePath, t));
            }
            return results;
        };

        PulsarSync.prototype.uploadFolder = function(dirPath) {
            return fs.traverseTree(dirPath, this.uploadFile.bind(this), (function(_this) {
                return function() {
                    return !_this.isIgnore(dirPath);
                };
            })(this), (function() {}));
        };

        PulsarSync.prototype.initMonitor = function() {
            let _this;
            _this = this;
            return setTimeout(function() {
                let MutationObserver, observer, targetObject;
                MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
                observer = new MutationObserver(function(mutations, observer) {
                    _this.monitorStyles();
                });
                targetObject = document.querySelector('.tree-view');
                if (targetObject !== null) {
                    return observer.observe(targetObject, {
                        subtree: true,
                        attributes: false,
                        childList: true
                    });
                }
            }, 250);
        };

        PulsarSync.prototype.monitorFile = function(dirPath, toggle, notifications) {
            let _this, fileName, index;
            if (toggle == null) {
                toggle = true;
            }
            if (notifications == null) {
                notifications = true;
            }
            if (!this.fileExists(dirPath) && !this.isDirectory(dirPath)) {
                return;
            }
            fileName = this.monitorFileName(dirPath);
            if (indexOf.call(MonitoredFiles, dirPath) < 0) {
                MonitoredFiles.push(dirPath);
                watcher.add(dirPath);
                if (notifications) {
                    atom.notifications.addInfo("PulsarSync: Watching file - *" + fileName + "*");
                }
                if (!watchChangeSet) {
                    _this = this;
                    watcher.on('change', function(path) {
                        return _this.uploadFile(path);
                    });
                    watcher.on('unlink', function(path) {
                        return _this.deleteFile(path);
                    });
                    watchChangeSet = true;
                }
            } else if (toggle) {
                watcher.unwatch(dirPath);
                index = MonitoredFiles.indexOf(dirPath);
                MonitoredFiles.splice(index, 1);
                if (notifications) {
                    atom.notifications.addInfo("PulsarSync: Unwatching file - *" + fileName + "*");
                }
            }
            return this.monitorStyles();
        };

        PulsarSync.prototype.monitorStyles = function() {
            let file, file_name, i, icon_file, item, j, len, len1, list_item, monitorClass, monitored, pulseClass, results;
            monitorClass = 'file-monitoring';
            pulseClass = 'pulse';
            monitored = document.querySelectorAll('.' + monitorClass);
            if (monitored !== null && monitored.length !== 0) {
                for (i = 0, len = monitored.length; i < len; i++) {
                    item = monitored[i];
                    item.classList.remove(monitorClass);
                }
            }
            results = [];
            for (j = 0, len1 = MonitoredFiles.length; j < len1; j++) {
                file = MonitoredFiles[j];
                file_name = file.replace(/(['"])/g, "\\$1");
                file_name = file.replace(/\\/g, '\\\\');
                icon_file = document.querySelector('[data-path="' + file_name + '"]');
                if (icon_file !== null) {
                    list_item = icon_file.parentNode;
                    list_item.classList.add(monitorClass);
                    if (atom.config.get("pulsar-sync.monitorFileAnimation")) {
                        results.push(list_item.classList.add(pulseClass));
                    } else {
                        results.push(void 0);
                    }
                } else {
                    results.push(void 0);
                }
            }
            return results;
        };

        PulsarSync.prototype.monitorFilesList = function() {
            let file, files, i, k, len, ref, v, watchedPaths;
            files = "";
            watchedPaths = watcher.getWatched();
            for (k in watchedPaths) {
                v = watchedPaths[k];
                ref = watchedPaths[k];
                for (i = 0, len = ref.length; i < len; i++) {
                    file = ref[i];
                    files += file + "<br/>";
                }
            }
            if (files !== "") {
                return atom.notifications.addInfo("PulsarSync: Currently watching:<br/>*" + files + "*");
            } else {
                return atom.notifications.addWarning("PulsarSync: Currently not watching any files");
            }
        };

        PulsarSync.prototype.fileExists = function(dirPath) {
            let e, exists, file_name;
            file_name = this.monitorFileName(dirPath);
            try {
                exists = fs.statSync(dirPath);
                return true;
            } catch (error) {
                e = error;
                atom.notifications.addWarning("PulsarSync: cannot find *" + file_name + "* to watch");
                return false;
            }
        };

        PulsarSync.prototype.isDirectory = function(dirPath) {
            let directory;
            if (directory = fs.statSync(dirPath).isDirectory()) {
                atom.notifications.addWarning("PulsarSync: cannot watch directory - *" + dirPath + "*");
                return false;
            }
            return true;
        };

        PulsarSync.prototype.monitorFileName = function(dirPath) {
            let file;
            file = dirPath.split('\\').pop().split('/').pop();
            return file;
        };

        PulsarSync.prototype.initAutoFileWatch = function(projectPath) {
            let _this, filesName, i, len;
            _this = this;
            if (watchFiles.length !== 0) {
                for (i = 0, len = watchFiles.length; i < len; i++) {
                    filesName = watchFiles[i];
                    _this.setupAutoFileWatch(filesName, projectPath);
                }
                setTimeout(function() {
                    return _this.monitorFilesList();
                }, 1500);
            }
        };

        PulsarSync.prototype.setupAutoFileWatch = function(filesName, projectPath) {
            let _this;
            _this = this;
            return setTimeout(function() {
                let fullpath;
                if (process.platform === "win32") {
                    filesName = filesName.replace(/\//g, '\\');
                }
                fullpath = projectPath + filesName.replace(/^\s+|\s+$/g, "");
                return _this.monitorFile(fullpath, false, false);
            }, 250);
        };

        PulsarSync.prototype.uploadGitChange = function(dirPath) {
            let curRepo, i, isChangedPath, len, repo, repos, workingDirectory;
            repos = atom.project.getRepositories();
            curRepo = null;
            for (i = 0, len = repos.length; i < len; i++) {
                repo = repos[i];
                if (!repo) {
                    continue;
                }
                workingDirectory = repo.getWorkingDirectory();
                if (this.inPath(workingDirectory, this.projectPath)) {
                    curRepo = repo;
                    break;
                }
            }
            if (!curRepo) {
                return;
            }
            isChangedPath = function(path) {
                let status;
                status = curRepo.getCachedPathStatus(path);
                return curRepo.isStatusModified(status) || curRepo.isStatusNew(status);
            };
            return fs.traverseTree(dirPath, (function(_this) {
                return function(path) {
                    if (isChangedPath(path)) {
                        return _this.uploadFile(path);
                    }
                };
            })(this), (function(_this) {
                return function(path) {
                    return !_this.isIgnore(path);
                };
            })(this), (function() {}));
        };

        PulsarSync.prototype.createTransport = function(host) {
            let Transport;
            if (host.transport === 'scp' || host.transport === 'sftp') {
                Transport = ScpTransport;
            } else if (host.transport === 'ftp') {
                Transport = FtpTransport;
            } else {
                throw new Error("[pulsar-sync] invalid transport: " + host.transport + " in " + this.configPath);
            }
            return new Transport(getLogger(), host, this.projectPath);
        };

        PulsarSync.prototype.getTransport = function() {
            if (this.transport) {
                return this.transport;
            }
            this.transport = this.createTransport(this.host);
            return this.transport;
        };

        PulsarSync.prototype.getUploadMirrors = function() {
            let host, i, len, ref;
            if (this.mirrorTransports) {
                return this.mirrorTransports;
            }
            this.mirrorTransports = [];
            if (this.host.uploadMirrors) {
                ref = this.host.uploadMirrors;
                for (i = 0, len = ref.length; i < len; i++) {
                    host = ref[i];
                    this.initIgnore(host);
                    this.mirrorTransports.push(this.createTransport(host));
                }
            }
            return this.mirrorTransports;
        };

        return PulsarSync;

    })();

    module.exports = {
        create: function(projectPath) {
            let configPath;
            configPath = path.join(projectPath, atom.config.get('pulsar-sync.configFileName'));
            if (!fs.existsSync(configPath)) { // Project  not configured
                return;
            }
            return new PulsarSync(projectPath, configPath);
        },
        configure: function(projectPath, callback) {
            let configPath, emitter, host, view;

            emitter = new EventEmitter();
            emitter.on("configured", callback);
            configPath = path.join(projectPath, atom.config.get('pulsar-sync.configFileName'));
            host = new Host(configPath, getLogger(), emitter);
            view = new HostView(host);
            return view.attach();
        }
    };
