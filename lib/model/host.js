  const fs = require("fs-plus");
  const EventEmitter = require("events").EventEmitter;

  let Host;

  module.exports = Host = (function() {
    function Host(configPath1, logger, emitter1) {
      let data, err, k, settings, v;
      this.configPath = configPath1;
      this.logger = logger;
      this.emitter = emitter1;
      if (!fs.existsSync(this.configPath)) {
        return;
      }
      try {
        data = fs.readFileSync(this.configPath, "utf8");
        settings = JSON.parse(data);
        for (k in settings) {
          v = settings[k];
          this[k] = v;
        }
      } catch (error1) {
        err = error1;
        this.logger.error(err + ", in file: " + this.configPath);
        atom.notifications.addError("PulsarSync Error", {
          dismissable: true,
          detail: "" + err,
          description: "" + this.configPath
        });
        throw error;
      }
      if (this.port == null) {
        this.port = "";
      }
      this.port = this.port.toString();
      if (this.ignore) {
        this.ignore = this.ignore.join(", ");
      }
      if (this.watch) {
        this.watch = this.watch.join(", ");
      }
    }

    Host.prototype.saveJSON = function() {
      let configPath, emitter, val;
      configPath = this.configPath;
      emitter = this.emitter;
      this.configPath = void 0;
      this.emitter = void 0;
      if (this.ignore == null) {
        this.ignore = ".sync.json,.git/**";
      }
      this.ignore = this.ignore.split(',');
      this.ignore = (function() {
        let i, len, ref, results;
        ref = this.ignore;
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          val = ref[i];
          if (val) {
            results.push(val.trim());
          }
        }
        return results;
      }).call(this);
      if (this.watch == null) {
        this.watch = "";
      }
      this.watch = this.watch.split(',');
      this.watch = (function() {
        let i, len, ref, results;
        ref = this.watch;
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          val = ref[i];
          if (val) {
            results.push(val.trim());
          }
        }
        return results;
      }).call(this);
      if (this.transport == null) {
        this.transport = "scp";
      }
      return fs.writeFile(configPath, JSON.stringify(this, null, 2), function(err) {
        if (err) {
          return console.log("Failed saving file " + configPath);
        } else {
          return emitter.emit('configured');
        }
      });
    };

    return Host;

  })();
