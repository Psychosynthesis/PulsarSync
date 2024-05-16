const messagePanel = require("atom-message-panel");

let Logger;

let PlainMessageView = null;
let AutoHideTimer = null;

module.exports = Logger = (function() {
    function Logger(title) {
        this.title = title;
    }

    Logger.prototype.showInPanel = function(message, className) {
        let MessagePanelView, msg;
        if (atom.config.get("pulsar-sync.logToAtomNotifications")) {
            if (className === 'text-error') {
                atom.notifications.addError("" + message);
            } else {
                atom.notifications.addInfo("" + message);
            }
        }
        if (!this.panel) {
            MessagePanelView = messagePanel.MessagePanelView,
            PlainMessageView = messagePanel.PlainMessageView;
            this.panel = new MessagePanelView({
                title: this.title
            });
        }
        this.panel.attach();
        msg = new PlainMessageView({
            message: message,
            className: className
        });
        this.panel.add(msg);
        this.panel.setSummary({
            summary: message,
            className: className
        });
        this.panel.body.scrollTop(1e10);
        if (atom.config.get("pulsar-sync.foldLogPanel") && !this.foldedPanel) {
            this.panel.toggle();
            this.foldedPanel = true;
        }
        return msg;
    };

    Logger.prototype.log = function(message) {
        let date, msg, notifymessage, startTime;
        date = new Date;
        startTime = date.getTime();
        notifymessage = "" + message;
        message = "[" + (date.toLocaleTimeString()) + "] " + message;
        if (atom.config.get("pulsar-sync.logToAtomNotifications")) {
            atom.notifications.addInfo("" + notifymessage);
        }
        if (atom.config.get("pulsar-sync.logToConsole")) {
            console.log(message);
            return function() {
                return console.log(message + " Complete (" + (Date.now() - startTime) + "ms)");
            };
        } else {
            if (AutoHideTimer) {
                clearTimeout(AutoHideTimer);
                AutoHideTimer = null;
            }
            if (!atom.config.get("pulsar-sync.logToAtomNotifications")) {
                msg = this.showInPanel(message, "text-info");
            }
            return (function(_this) {
                return function() {
                    let endMsg;
                    endMsg = " Complete (" + (Date.now() - startTime) + "ms)";
                    if (atom.config.get("pulsar-sync.logToAtomNotifications")) {
                        return atom.notifications.addSuccess(endMsg);
                    } else {
                        msg.append(endMsg);
                        _this.panel.setSummary({
                            summary: message + " " + endMsg,
                            className: "text-info"
                        });
                        if (atom.config.get("pulsar-sync.autoHideLogPanel")) {
                            return AutoHideTimer = setTimeout(_this.panel.close.bind(_this.panel), 1000);
                        }
                    }
                };
            })(this);
        }
    };

    Logger.prototype.error = function(message) {
        if (atom.config.get("pulsar-sync.logToAtomNotifications")) {
            return atom.notifications.addError("" + message);
        } else {
            return this.showInPanel("" + message, "text-error");
        }
    };

    return Logger;

})();
