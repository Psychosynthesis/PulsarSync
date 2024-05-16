  const FTPConnection = require("ftp");
  const mkdirp = require("mkdirp");
  const fs = require("fs-plus");
  const path = require("path");

  module.exports = FtpTransport = (function() {
    function FtpTransport(logger, settings, projectPath) {
      this.logger = logger;
      this.settings = settings;
      this.projectPath = projectPath;
    }

    FtpTransport.prototype.dispose = function() {
      if (this.connection) {
        this.connection.end();
        return this.connection = null;
      }
    };

    FtpTransport.prototype["delete"] = function(localFilePath, callback) {
      let errorHandler, targetFilePath;
      targetFilePath = path.join(this.settings.target, path.relative(this.projectPath, localFilePath)).replace(/\\/g, "/");
      errorHandler = (function(_this) {
        return function(err) {
          _this.logger.error(err);
          return callback();
        };
      })(this);
      return this._getConnection((function(_this) {
        return function(err, c) {
          let end;
          if (err) {
            return errorHandler(err);
          }
          end = _this.logger.log("Remote delete: " + targetFilePath + " ...");
          return c["delete"](targetFilePath, function(err) {
            if (err) {
              return errorHandler(err);
            }
            end();
            return callback();
          });
        };
      })(this));
    };

    FtpTransport.prototype.upload = function(localFilePath, callback) {
      let errorHandler, targetFilePath;
      targetFilePath = path.join(this.settings.target, path.relative(this.projectPath, localFilePath)).replace(/\\/g, "/");
      errorHandler = (function(_this) {
        return function(err) {
          _this.logger.error(err);
          return callback();
        };
      })(this);
      return this._getConnection((function(_this) {
        return function(err, c) {
          let end, mpath;
          if (err) {
            return errorHandler(err);
          }
          end = _this.logger.log("Upload: " + localFilePath + " to " + targetFilePath + " ...");
          mpath = path.dirname(targetFilePath);
          return c.mkdir(mpath, true, function(err) {
            if (err && mpath !== "/") {
              return errorHandler(err);
            }
            return c.put(localFilePath, targetFilePath, function(err) {
              if (err) {
                return errorHandler(err);
              }
              end();
              return callback();
            });
          });
        };
      })(this));
    };

    FtpTransport.prototype.download = function(targetFilePath, localFilePath, callback) {
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
          return mkdirp(path.dirname(localFilePath), function(err) {
            if (err) {
              return errorHandler(err);
            }
            return c.get(targetFilePath, function(err, readableStream) {
              let writableStream;
              if (err) {
                return errorHandler(err);
              }

              writableStream = fs.createWriteStream(localFilePath);
              writableStream.on("unpipe", function() {
                end();
                return typeof callback === "function" ? callback() : void 0;
              });
              return readableStream.pipe(writableStream);
            });
          });
        };
      })(this));
    };

    FtpTransport.prototype.fetchFileTree = function(localPath, callback) {
      let isIgnore, targetPath;
      targetPath = path.join(this.settings.target, path.relative(this.projectPath, localPath)).replace(/\\/g, "/");
      isIgnore = this.settings.isIgnore;
      return this._getConnection(function(err, c) {
        let directories, directory, files;
        if (err) {
          return callback(err);
        }
        files = [];
        directories = 0;
        directory = function(dir) {
          directories++;
          return c.list(dir, function(err, list) {
            if (err) {
              return callback(err);
            }
            if (list != null) {
              list.forEach(function(item, i) {
                let ref;
                if (item.type === "-" && !isIgnore(item.name, dir)) {
                  files.push(dir + "/" + item.name);
                }
                if (item.type === "d" && ((ref = item.name) !== "." && ref !== "..")) {
                  return directory(dir + "/" + item.name);
                }
              });
            }
            directories--;
            if (directories === 0) {
              return callback(null, files);
            }
          });
        };
        return directory(targetPath);
      });
    };

    FtpTransport.prototype._getConnection = function(callback) {
      const settings = this.settings;
      if (!settings) {
          return;
      }

      let FtpConnection, connection, hostname, password, port, secure, username, wasReady;
      hostname = settings.hostname, port = settings.port,
      username = settings.username, password = settings.password,
      secure = settings.secure;

      const keepalive = (settings.keepalive > 0) ? settings.keepalive * 1000 : 0;
      FtpTransport.prototype.keepalive = keepalive;


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

      connection = new FtpConnection;
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
      return connection.connect({
        host: hostname,
        port: port,
        user: username,
        password: password,
        secure: secure
      });
    };

    return FtpTransport;

  })();
