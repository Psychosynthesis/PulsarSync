const async = require("async");
const minimatch = require("minimatch");

module.exports = {
    run: function(logger, transport, path, targetPath, callback) {
      logger.log("Downloading all files: " + path);
      return transport.fetchFileTree(path, function(err, files) {
        if (err) {
          return logger.error(err);
        }
        return async.mapSeries(files, function(file, callback) {
          return transport.download(file, targetPath, callback);
        }, function(err) {
          if (err) {
            return logger.error;
          }
          if (err) {
            return logger.error(err);
          }
          logger.log("Downloaded all files: " + path);
          return typeof callback === "function" ? callback() : void 0;
        });
      });
    }
  };
