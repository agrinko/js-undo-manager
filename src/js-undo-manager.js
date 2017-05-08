"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*!
 * JavaScript Undo Manager 1.0.0
 * Simple JavaScript undo/redo command manager supporting transactions with no dependencies.
 *
 * Copyright: Alexey Grinko, 2017
 * Git repository: https://github.com/agrinko/js-undo-manager.git
 *
 * @license MIT - https://opensource.org/licenses/MIT
 */
(function (global) {

    /////////// SOURCE CODE ///////////////

    /**
     * Default settings
     */
    var DEFAULTS = {
        limit: 100, // maximum commands stack size
        debug: false, // whether to emit execution status in console
        bindHotKeys: false, // whether to bind "undo" and "redo" commands to "Ctrl+Z", "Ctrl+Y" & "Ctrl+Shift+Z" hot keys
        useTransactions: true // whether to initialize transactions manager
    };

    /**
     * Main class
     * @class JSUndoManager
     */

    var JSUndoManager = function () {
        function JSUndoManager(options) {
            _classCallCheck(this, JSUndoManager);

            options = assign({}, DEFAULTS, options);

            this.limit = options.limit;
            this.options = options;
            this.reset();

            if (options.useTransactions) {
                this.transaction = new TransactionManager(this);
            }
            if (options.bindHotKeys) {
                this.bindHotKeys();
            }

            this.log("Initialized with stack limit of " + this.limit + " commands");
        }

        /**
         * Bind 'undo' and 'redo' actions to 'Ctrl+Z', 'Ctrl+Y' & 'Ctrl+Shift+Z' hot keys.
         * It is a basic implementation for quick testing and should be replaced with custom event handlers
         * for more flexible processing.
         * @returns {JSUndoManager}
         */


        _createClass(JSUndoManager, [{
            key: "bindHotKeys",
            value: function bindHotKeys() {
                var _this = this;

                this.log("Bound 'undo' and 'redo' actions to 'Ctrl+Z', 'Ctrl+Y' & 'Ctrl+Shift+Z' hot keys");

                document.addEventListener("keydown", function (e) {
                    var Y = 89,
                        Z = 90;

                    if (e.keyCode === Z && e.ctrlKey && !e.shiftKey) {
                        _this.undo();
                    } else if (e.keyCode === Z && e.ctrlKey && e.shiftKey || e.keyCode === Y && e.ctrlKey) {
                        _this.redo();
                    }
                });

                return this;
            }

            /**
             * Remember executed command containing "redo" and "undo" functions
             * @param {Object|Function} command - either an object with "redo" and "undo" functions or "redo" function itself
             * @param {Function} [undo] - "undo" function, used if the first argument is also a function
             * @returns {JSUndoManager}
             */

        }, {
            key: "record",
            value: function record(command) {
                if (command && typeof command.redo === "function" && typeof command.undo === "function") {
                    this._record(command);
                } else if (typeof arguments[0] === "function" && typeof arguments[1] === "function") {
                    this._record({
                        redo: arguments[0],
                        undo: arguments[1]
                    });
                } else {
                    throw new TypeError("JSUndoManager.record(): unexpected arguments");
                }

                return this;
            }

            /**
             * Execute function and record it with its opposite "undo" function
             * @param {Object|Function} command - either an object with "redo" and "undo" functions or "redo" function itself
             * @param {Function} [undo] - "undo" function, used if the first argument is also a function
             * @returns {JSUndoManager}
             */

        }, {
            key: "execute",
            value: function execute(command) {
                var doFunction = command.redo || command;

                this.record.apply(this, arguments);

                this.log("Executing function...");
                doFunction();

                return this;
            }
        }, {
            key: "_record",
            value: function _record(command) {
                if (this.transaction.isInProgress()) return this.transaction._record(command);

                this.log("Recording command", command);

                this._rebase();

                this.stack.push(command);
                this.sp++;

                this._keepLimit();
            }

            //forget "future" commands if stack pointer is not at the end

        }, {
            key: "_rebase",
            value: function _rebase() {
                if (this.canRedo()) this.stack.length = this.sp + 1;
            }

            //sustain limited size of stack; cut extra commands starting with the latest ones

        }, {
            key: "_keepLimit",
            value: function _keepLimit() {
                if (this.stack.length <= this.limit) return;

                var exceedsBy = this.stack.length - this.limit;

                this.log("Stack size reached its limit: ${this.limit} commands. Cutting off most old commands...");

                if (exceedsBy === 1) this.stack.shift(); //this is the most common case, so using "shift" will increase performance a bit
                else this.stack.splice(0, exceedsBy);

                this.sp -= exceedsBy; //normalize stack pointer for the new stack length
            }

            /**
             * Undo previous command if possible
             * @returns {JSUndoManager}
             */

        }, {
            key: "undo",
            value: function undo() {
                if (!this.canUndo()) return this;

                var command = this.stack[this.sp];

                this.log("undo");

                this.sp--;
                command.undo();

                return this;
            }

            /**
             * Check whether undoing previous command is possible
             * @returns {boolean}
             */

        }, {
            key: "canUndo",
            value: function canUndo() {
                return this.sp >= 0;
            }

            /**
             * Redo the command which was previously undone
             * @returns {JSUndoManager}
             */

        }, {
            key: "redo",
            value: function redo() {
                if (!this.canRedo()) return this;

                var command = this.stack[this.sp + 1]; //execute next command after stack pointer

                this.log("redo");

                this.sp++;
                command.redo();

                return this;
            }

            /**
             * Check whether redoing command is possible
             * @returns {boolean}
             */

        }, {
            key: "canRedo",
            value: function canRedo() {
                return this.sp < this.stack.length - 1; //if stack pointer is not at the end
            }

            /**
             * Change stack size limit initially defined in the constructor options
             * @param {number} limit
             */

        }, {
            key: "setLimit",
            value: function setLimit(limit) {
                var redoable = this.stack.length - this.sp - 1;

                if (limit < 1 || !(typeof limit === "number")) throw new TypeError("JSUndoManager.setLimit(): unexpected argument limit=" + limit + ". Should be a positive number");

                if (limit < redoable) {
                    console.warn("JSUndoManager.setLimit(): cannot set stack limit (" + limit + ") less than the number of 'redoable' commands (" + redoable + ")");
                } else {
                    this.limit = Math.floor(limit);
                    this._keepLimit();
                }

                return this;
            }

            /**
             * Reset all commands from memory
             */

        }, {
            key: "reset",
            value: function reset() {
                this.log("reset");
                this.stack = [];
                this.sp = -1;
                return this;
            }

            /**
             * Check whether the commands stack is empty
             * @returns {boolean}
             */

        }, {
            key: "isEmpty",
            value: function isEmpty() {
                return !this.stack.length;
            }

            /**
             * Check whether the commands stack size reaches its limit
             * @returns {boolean}
             */

        }, {
            key: "isFull",
            value: function isFull() {
                return this.stack.length === this.limit;
            }

            /**
             * Get number of commands in memory stack
             * @returns {Number}
             */

        }, {
            key: "getSize",
            value: function getSize() {
                return this.stack.length;
            }
        }, {
            key: "log",
            value: function log(msg) {
                var _console;

                for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                    args[_key - 1] = arguments[_key];
                }

                if (this.options.debug) (_console = console).log.apply(_console, ["Command Manager: " + msg].concat(args));
            }
        }]);

        return JSUndoManager;
    }();

    /**
     * Transaction manager helper.
     * Allows working with transactions from JSUndoManager. Requires its instance as a constructor's parameter.
     * @class TransactionManager
     */


    var TransactionManager = function () {
        _createClass(TransactionManager, null, [{
            key: "_execForward",
            value: function _execForward(sequence) {
                for (var i = 0; i < sequence.length; i++) {
                    sequence[i].redo();
                }
            }
        }, {
            key: "_execBack",
            value: function _execBack(sequence) {
                for (var i = sequence.length - 1; i >= 0; i--) {
                    sequence[i].undo();
                }
            }
        }]);

        function TransactionManager(tracker) {
            _classCallCheck(this, TransactionManager);

            this.tracker = tracker;
            this._reset();

            tracker.log("TransactionManager is initialized");
        }

        _createClass(TransactionManager, [{
            key: "begin",
            value: function begin() {
                this.state = TransactionManager.IN_PROGRESS;
                this.tracker.log("Begin transaction");
            }
        }, {
            key: "end",
            value: function end() {
                var seq = this.sequence;

                this._reset();

                if (seq.length > 0) {
                    this.tracker.record({
                        redo: TransactionManager._execForward.bind(null, seq),
                        undo: TransactionManager._execBack.bind(null, seq)
                    });
                }

                this.tracker.log("End transaction");
            }
        }, {
            key: "cancel",
            value: function cancel() {
                TransactionManager._execBack(this.sequence);
                this._reset();

                this.tracker.log("Cancel transaction");
            }
        }, {
            key: "isInProgress",
            value: function isInProgress() {
                return this.state === TransactionManager.IN_PROGRESS;
            }
        }, {
            key: "isPending",
            value: function isPending() {
                return this.state === TransactionManager.PENDING;
            }
        }, {
            key: "_record",
            value: function _record(command) {
                this.sequence.push(command);
                this.tracker.log("Recording command in transaction...", command);
            }
        }, {
            key: "_reset",
            value: function _reset() {
                this.state = TransactionManager.PENDING;
                this.sequence = [];
            }
        }]);

        return TransactionManager;
    }();

    TransactionManager.PENDING = 0;
    TransactionManager.IN_PROGRESS = 1;

    /////////// SOURCE CODE END ///////////////

    // HELPER FUNCTIONS
    /**
     * Emulate ES6 Object.assign behaviour if native function is not defined
     */
    var assign = Object.assign || function (target) {
        for (var i = 1; i < arguments.length; i++) {
            for (var key in arguments[i]) {
                if (arguments[i].hasOwnProperty(key)) {
                    target[key] = arguments[i][key];
                }
            }
        }

        return target;
    };

    // EXPOSING THE COMPONENT

    // AMD style
    if (typeof define === "function" && define.amd) {
        define(function () {
            return JSUndoManager;
        });
        // CommonJS style
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = JSUndoManager;
        // global definition
    } else {
        global.JSUndoManager = JSUndoManager;
    }
})(window);