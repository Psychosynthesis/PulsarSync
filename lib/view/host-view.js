const ref = require('atom-space-pen-views');
const CompositeDisposable = require('atom').CompositeDisposable;

const hasProp = {}.hasOwnProperty;

const extendClass = function(child, parent) {
    for (let key in parent) {
        if (hasProp.call(parent, key)) child[key] = parent[key];
    }
    function ctor() {
        this.constructor = child;
    }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
    child.__super__ = parent.prototype;
    return child;
};

const $ = ref.$;
const View = ref.View
const TextEditorView = ref.TextEditorView;


module.exports = ConfigView = (function(superClass) {
    extendClass(ConfigView, superClass);

    function ConfigView() {
        return ConfigView.__super__.constructor.apply(this, arguments);
    }

    ConfigView.prototype.panel = null;

    ConfigView.content = function() {
        return this.div(
            { "class": 'pulsar-sync' },
            (function(_this) {
            return function() {
                _this.div(
                    { "class": 'block' },
                    function() {
                    return _this.div({
                        "class": 'btn-group',
                        outlet: 'transportGroup'
                    }, function() {
                        _this.button({
                            "class": 'btn  selected',
                            targetBlock: 'authenticationButtonsBlock'
                        }, 'SCP/SFTP');
                        return _this.button({
                            "class": 'btn',
                            targetBlock: 'ftpPasswordBlock'
                        }, 'FTP');
                    });
                });
                _this.label('Hostname');
                _this.subview('hostname', new TextEditorView({ mini: true }));

                _this.label('Port');
                _this.subview('port', new TextEditorView({ mini: true }));

                _this.label('Target directory');
                _this.subview('target', new TextEditorView({ mini: true }));

                _this.label('Ignore Paths');
                _this.subview('ignore', new TextEditorView({
                    mini: true,
                    placeholderText: "Default: .sync.json, .git/**"
                }));

                _this.label('Username');
                _this.subview('username', new TextEditorView({ mini: true }));
                _this.div({
                    "class": 'block',
                    outlet: 'authenticationButtonsBlock'
                }, function() {
                    _this.div(
                        { "class": 'btn-group' },
                        function() {
                            _this.a({ "class": 'btn  selected', targetBlock: 'privateKeyBlock' }, 'privatekey');
                            _this.a({ "class": 'btn', targetBlock: 'passwordBlock' }, 'password');
                            return _this.a({ "class": 'btn', outlet: 'userAgentButton' }, 'useAgent');
                        }
                    );
                    _this.div(
                        { "class": 'block', outlet: 'privateKeyBlock' },
                        function() {
                            _this.label('Keyfile path');
                            _this.subview('privateKeyPath', new TextEditorView({ mini: true }));
                            _this.label('Passphrase');
                            return _this.subview('privateKeyPassphrase', new TextEditorView({
                                mini: true,
                                placeholderText: "leave blank if private key is unencrypted"
                            }));
                        }
                    );
                    return _this.div({
                        "class": 'block',
                        outlet: 'passwordBlock',
                        style: 'display:none'
                    }, function() {
                        _this.label('Password');
                        return _this.subview('password', new TextEditorView({ mini: true }));
                    });
                });
                _this.div({
                    "class": 'block',
                    outlet: 'ftpPasswordBlock',
                    style: 'display:none'
                }, function() {
                    return _this.label('Password');
                });
                _this.label('Keepalive');
                _this.subview('keepalive', new TextEditorView({
                    mini: true,
                    placeholderText: "Interval to send keepalive requests in seconds. Leave blank to disable"
                }));
                _this.label('Watch automatically');
                _this.subview('watch', new TextEditorView({
                    mini: true,
                    placeholderText: "Files that will be automatically watched on project open"
                }));
                _this.div(function() {
                    return _this.label(" uploadOnSave", function() {
                        return _this.input({
                            type: 'checkbox',
                            outlet: 'uploadOnSave'
                        });
                    });
                });
                _this.div(function() {
                    return _this.label(" useAtomicWrites", function() {
                        return _this.input({
                            type: 'checkbox',
                            outlet: 'useAtomicWrites'
                        });
                    });
                });
                _this.label(" Delete local file/folder upon remote delete", function() {
                    return _this.input({
                        type: 'checkbox',
                        outlet: 'deleteLocal'
                    });
                });
                return _this.div(
                    { "class": 'block pull-right' },
                    function() {
                    _this.button({
                        "class": 'inline-block-tight btn',
                        outlet: 'cancelButton',
                        click: 'close'
                    }, 'Cancel');
                    return _this.button({
                        "class": 'inline-block-tight btn',
                        outlet: 'saveButton',
                        click: 'confirm'
                    }, 'Save');
                });
            };
        })(this));
    };

    ConfigView.prototype.initialize = function(host) {
        this.host = host;
        this.disposables = new CompositeDisposable;
        this.disposables.add(atom.commands.add('atom-workspace', {
            'core:confirm': (function(_this) {
                return function() {
                    return _this.confirm();
                };
            })(this),
            'core:cancel': (function(_this) {
                return function(event) {
                    _this.close();
                    return event.stopPropagation();
                };
            })(this)
        }));
        this.transportGroup.on('click', (function(_this) {
            return function(e) {
                let btn, targetBlock;
                e.preventDefault();
                btn = $(e.target);
                targetBlock = btn.addClass('selected').siblings('.selected').removeClass('selected').attr("targetBlock");
                if (targetBlock) { _this[targetBlock].hide(); }
                targetBlock = btn.attr("targetBlock");
                if (targetBlock) { _this[targetBlock].show(); }
                _this.host.transport = btn.text().split("/")[0].toLowerCase();
                if (_this.host.transport === "scp") {
                    return _this.passwordBlock.append(_this.password);
                } else {
                    return _this.ftpPasswordBlock.append(_this.password);
                }
            };
        })(this));
        return $('.btn-group .btn', this.authenticationButtonsBlock).on('click', (function(_this) {
            return function(e) {
                let targetBlock;
                e.preventDefault();
                targetBlock = $(e.target).addClass('selected').siblings('.selected').removeClass('selected').attr("targetBlock");
                if (targetBlock) {
                    _this[targetBlock].hide();
                }
                targetBlock = $(e.target).attr("targetBlock");
                if (targetBlock) {
                    return _this[targetBlock].show().find(".editor").first().focus();
                }
            };
        })(this));
    };

    ConfigView.prototype.attach = function() {
        if (this.panel == null) {
            this.panel = atom.workspace.addModalPanel({ item: this });
        }
        this.find(".editor").each((function(_this) {
            return function(i, editor) {
                let dataName;
                dataName = $(editor).prev().text().split(" ")[0].toLowerCase();
                return $(editor).view().setText(_this.host[dataName] || "");
            };
        })(this));
        this.uploadOnSave.prop('checked', this.host.uploadOnSave);
        this.useAtomicWrites.prop('checked', this.host.useAtomicWrites);
        this.deleteLocal.prop('checked', this.host.deleteLocal);
        if (this.host.transport) {
            $(":contains('" + this.host.transport.toUpperCase() + "')", this.transportGroup).click();
        }
        if (this.host.transport === "scp") {
            return $('.btn-group .btn', this.authenticationButtonsBlock).each((function(_this) {
                return function(i, btn) {
                    btn = $(btn);
                    if (!_this.host[btn.text()]) {
                        return;
                    }
                    btn.click();
                    return false;
                };
            })(this));
        }
    };

    ConfigView.prototype.close = function() {
        this.detach();
        this.panel.destroy();
        this.panel = null;
        return this.disposables.dispose();
    };

    ConfigView.prototype.confirm = function() {
        this.host.uploadOnSave = this.uploadOnSave.prop('checked');
        this.host.useAtomicWrites = this.useAtomicWrites.prop('checked');
        this.host.deleteLocal = this.deleteLocal.prop('checked');
        this.find(".editor").each((function(_this) {
            return function(i, editor) {
                let dataName, val, view;
                dataName = $(editor).prev().text().split(" ")[0].toLowerCase();
                view = $(editor).view();
                val = view.getText();
                if (val === "" || view.parent().isHidden() || view.parent().parent().isHidden()) {
                    val = void 0;
                }
                return _this.host[dataName] = val;
            };
        })(this));
        if ((this.host.transport === void 0 || this.host.transport === "scp") && this.userAgentButton.hasClass('selected')) {
            this.host.useAgent = true;
        } else {
            this.host.useAgent = void 0;
        }
        this.host.keepalive = parseInt(this.host.keepalive) || 0;
        this.host.saveJSON();
        return this.close();
    };

    return ConfigView;

})(View);
