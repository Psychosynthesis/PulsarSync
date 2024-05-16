const SSHConnection = require("ssh2");
const mkdirp = require("mkdirp");
const fs = require("fs");
const path = require("path");

module.exports = ScpTransport = (function() {
    function ScpTransport(logger, settings, projectPath) {
        this.logger = logger;
        this.settings = settings;
        this.projectPath = projectPath;
    }

    ScpTransport.prototype.dispose = function() {
        if (this.connection) {
            this.connection.end();
            return this.connection = null;
        }
    };

    ScpTransport.prototype["delete"] = function(localFilePath, callback) {
        let errorHandler, targetFilePath;
        targetFilePath = path.join(this.settings.target, path.relative(this.projectPath, localFilePath)).replace(/\\/g, "/");
        errorHandler = (function(_this) {
            return function(err) {
                _this.logger.error(err);
                return callback(err);
            };
        })(this);
        return this._getConnection((function(_this) {
            return function(err, c) {
                let end;
                if (err) {
                    return errorHandler(err);
                }
                end = _this.logger.log("Remote delete: " + targetFilePath + " ...");
                return c.sftp(function(err, sftp) {
                    if (err) {
                        return errorHandler(err);
                    }
                    return c.exec("rm -rf \"" + targetFilePath + "\"", function(err) {
                        if (err) {
                            return errorHandler(err);
                        }
                        end();
                        sftp.end();
                        return callback();
                    });
                });
            };
        })(this));
    };

    ScpTransport.prototype.upload = function(localFilePath, callback) {
        let errorHandler, targetFilePath;
        if (!fs.existsSync(localFilePath)) {
            callback();
            return false;
        }
        targetFilePath = path.join(this.settings.target, path.relative(fs.realpathSync(this.projectPath), fs.realpathSync(localFilePath))).replace(/\\/g, "/");
        errorHandler = (function(_this) {
            return function(err) {
                _this.logger.error(err);
                return callback(err);
            };
        })(this);
        return this._getConnection((function(_this) {
            return function(err, c) {
                let end;
                if (err) {
                    return errorHandler(err);
                }
                end = _this.logger.log("Upload: " + localFilePath + " to " + targetFilePath + " ...");
                return c.exec("mkdir -p \"" + (path.dirname(targetFilePath)) + "\"", function(err) {
                    if (err) {
                        return errorHandler(err);
                    }
                    return c.sftp(function(err, sftp) {
                        let uploadFilePath;
                        if (err) {
                            return errorHandler(err);
                        }
                        uploadFilePath = _this.settings.useAtomicWrites ? targetFilePath + ".temp" : "" + targetFilePath;
                        return sftp.fastPut(localFilePath, uploadFilePath, function(err) {
                            if (err) {
                                return errorHandler(err);
                            }
                            sftp.end();
                            if (_this.settings.useAtomicWrites) {
                                return c.exec("cp \"" + uploadFilePath + "\" \"" + targetFilePath + "\"; rm \"" + uploadFilePath + "\"", function(err) {
                                    if (err) {
                                        return errorHandler(err);
                                    }
                                    end();
                                    return callback();
                                });
                            } else {
                                end();
                                return callback();
                            }
                        });
                    });
                });
            };
        })(this));
    };

    ScpTransport.prototype.download = function(targetFilePath, localFilePath, callback) {
        let errorHandler;
        if (!localFilePath) {
            localFilePath = this.projectPath;
        }
        localFilePath = path.resolve(localFilePath, path.relative(this.settings.target, targetFilePath));
        errorHandler = (function(_this) {
            return function(err) {
                return _this.logger.error(err);
            };
        })(this);
        return this._getConnection((function(_this) {
            return function(err, c) {
                let end;
                if (err) {
                    return errorHandler(err);
                }
                end = _this.logger.log("Download: " + targetFilePath + " to " + localFilePath + " ...");
                return c.sftp(function(err, sftp) {
                    if (err) {
                        return errorHandler(err);
                    }

                    return mkdirp(path.dirname(localFilePath), function(err) {
                        if (err) {
                            return errorHandler(err);
                        }
                        return sftp.fastGet(targetFilePath, localFilePath, function(err) {
                            if (err) {
                                return errorHandler(err);
                            }
                            end();
                            sftp.end();
                            return typeof callback === "function" ? callback() : void 0;
                        });
                    });
                });
            };
        })(this));
    };

    ScpTransport.prototype.fetchFileTree = function(localPath, callback) {
        let isIgnore, ref, target, targetPath;
        ref = this.settings, target = ref.target, isIgnore = ref.isIgnore;
        targetPath = path.join(target, path.relative(this.projectPath, localPath)).replace(/\\/g, "/");
        return this._getConnection(function(err, c) {
            if (err) {
                return callback(err);
            }
            return c.exec("find \"" + targetPath + "\" -type f", function(err, result) {
                let buf;
                if (err) {
                    return callback(err);
                }
                buf = "";
                result.on("data", function(data) {
                    return buf += data.toString();
                });
                return result.on("end", function() {
                    let files;
                    files = buf.split("\n").filter(function(f) {
                        return f && !isIgnore(f, target);
                    });
                    return callback(null, files);
                });
            });
        });
    };

    ScpTransport.prototype._getConnection = function(callback) {
        const settings = this.settings;
        if (!settings) { return; }

        let agent, connection, err, hostname, keyfile, passphrase, password, port, privateKey,
        readyTimeout, useAgent, username, wasReady;

        hostname = settings.hostname, port = settings.port, username = settings.username, password = settings.password,
        keyfile = settings.keyfile, useAgent = settings.useAgent, passphrase = settings.passphrase,
        readyTimeout = settings.readyTimeout;

        if (this.connection) {
            connection = this.connection;
            if (this.isConnected) {
                return callback(null, connection);
            } else {
                connection.on("ready", function() {
                    return callback(null, connection);
                });
                return;
            }
        }
        connection = new SSHConnection;
        this.connection = connection;
        this.isConnected = false;
        this.logger.log("Connecting: " + username + "@" + hostname + ":" + port);
        wasReady = false;
        connection.on("ready", (function(_this) {
            return function() {
                _this.isConnected = true;
                wasReady = true;
                return callback(null, connection);
            };
        })(this));
        connection.on("error", (function(_this) {
            return function(err) {
                if (!wasReady) {
                    callback(err);
                }
                return _this.connection = null;
            };
        })(this));
        connection.on("end", (function(_this) {
            return function() {
                _this.isConnected = false;
                return _this.connection = null;
            };
        })(this));
        if (keyfile) {
            try {
                privateKey = fs.readFileSync(keyfile);
            } catch (error) {
                err = error;
                callback(err);
                return false;
            }
        } else {
            privateKey = null;
        }
        agent = (function() {
            switch (false) {
                case useAgent !== true:
                    if (/windows/i.test(process.env['OS'])) {
                        return process.env['SSH_AUTH_SOCK'] || "pageant";
                    } else {
                        return process.env['SSH_AUTH_SOCK'] || null;
                    }
                    break;
                case typeof useAgent !== "string":
                    return useAgent;
                default:
                    return null;
            }
        })();
        connection.connect({
            host: hostname,
            port: port,
            username: username,
            password: password,
            privateKey: privateKey,
            passphrase: passphrase,
            readyTimeout: readyTimeout,
            agent: agent
        });
        return {
            keepaliveInterval: (settings.keepalive > 0) ? settings.keepalive * 1000 : 0
        };
    };

    return ScpTransport;

})();
