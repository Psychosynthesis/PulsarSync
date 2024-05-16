const async = require("async");
  let UploadListener;

  let minimatch = null;

  module.exports = UploadListener = (function() {
    function UploadListener() {}

    UploadListener.prototype.handleSave = function(localFilePath, transport) {
      return this.handleAction(localFilePath, transport, 'upload');
    };

    UploadListener.prototype.handleDelete = function(localFilePath, transport) {
      return this.handleAction(localFilePath, transport, 'delete');
    };

    UploadListener.prototype.handleAction = function(localFilePath, transport, action) {
      let task;
      if (!this.queue) {
        this.queue = async.queue(this.processFile.bind(this), atom.config.get('pulsar-sync.concurrentTransports'));
      }
      if (this.queue.length()) {
        task = this.queue._tasks.head;
        while (task) {
          if (task.data.localFilePath === localFilePath && task.data.action === action && task.data.transport.settings.transport === transport.settings.transport && task.data.transport.settings.hostname === transport.settings.hostname && task.data.transport.settings.port === transport.settings.port && task.data.transport.settings.target === transport.settings.target) {
            task.data.discard = true;
          }
          task = task.next;
        }
      }
      this.queue.resume();
      return this.queue.push({
        localFilePath: localFilePath,
        transport: transport,
        action: action,
        discard: false
      });
    };

    UploadListener.prototype.processFile = function(task, callback) {
      let action, cb, discard, localFilePath, transport;
      localFilePath = task.localFilePath, transport = task.transport, action = task.action, discard = task.discard;
      cb = (function(_this) {
        return function(err) {
          if (err) {
            _this.queue.pause();
            _this.queue.unshift(task);
          }
          return callback(err);
        };
      })(this);
      if (discard) {
        callback();
        return;
      }
      if (action === 'upload') {
        return transport.upload(localFilePath, cb);
      } else {
        return transport["delete"](localFilePath, cb);
      }
    };

    return UploadListener;

  })();
