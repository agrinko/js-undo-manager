/*!
 * JavaScript Undo Manager 1.0.0
 * Simple JavaScript undo/redo command manager supporting transactions with no dependencies.
 *
 * Copyright: Alexey Grinko, 2017
 * Git repository: https://github.com/agrinko/js-undo-manager.git
 *
 * @license MIT - https://opensource.org/licenses/MIT
 */
((global) => {

/////////// SOURCE CODE ///////////////

/**
 * Default settings
 */
const DEFAULTS = {
    limit: 100,     //maximum commands stack size
    debug: false    //whether to emit execution status in console
};

/**
 * Main class
 * @class JSUndoManager
 */
class JSUndoManager {
    constructor(options) {
        options = assign({}, DEFAULTS, options);

        this.transaction = new TransactionManager(this);
        this.limit = options.limit;
        this.options = options;
        this.reset();

        this.log(`Initialized with stack limit of ${this.limit} commands`);
    }

    /**
     * Remember executed command containing "redo" and "undo" functions
     * @param {Object|Function} command - either an object with "redo" and "undo" functions or "redo" function itself
     * @param {Function} [undo] - "undo" function, used if the first argument is also a function
     * @returns {JSUndoManager}
     */
    record(command) {
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
    execute(command) {
        let doFunction = command.redo || command;

        this.record.apply(this, arguments);

        this.log("Executing function...");
        doFunction();

        return this;
    }

    _record(command) {
        if (this.transaction.isInProgress())
            return this.transaction._record(command);

        this.log("Recording command", command);

        this._rebase();

        this.stack.push(command);
        this.sp++;

        this._keepLimit();
    }

    //forget "future" commands if stack pointer is not at the end
    _rebase() {
        if (this.canRedo())
            this.stack.length = this.sp + 1;
    }

    //sustain limited size of stack; cut extra commands starting with the latest ones
    _keepLimit() {
        if (this.stack.length <= this.limit)
            return;

        let exceedsBy = this.stack.length - this.limit;

        this.log("Stack size reached its limit: ${this.limit} commands. Cutting off most old commands...");

        if (exceedsBy === 1)
            this.stack.shift(); //this is the most common case, so using "shift" will increase performance a bit
        else
            this.stack.splice(0, exceedsBy);

        this.sp -= exceedsBy; //normalize stack pointer for the new stack length
    }

    /**
     * Undo previous command if possible
     * @returns {JSUndoManager}
     */
    undo() {
        if (!this.canUndo())
            return this;

        let command = this.stack[this.sp];

        this.log("undo");

        this.sp--;
        command.undo();

        return this;
    }

    /**
     * Check whether undoing previous command is possible
     * @returns {boolean}
     */
    canUndo() {
        return this.sp >= 0;
    }

    /**
     * Redo the command which was previously undone
     * @returns {JSUndoManager}
     */
    redo() {
        if (!this.canRedo())
            return this;

        let command = this.stack[this.sp + 1]; //execute next command after stack pointer

        this.log("redo");

        this.sp++;
        command.redo();

        return this;
    }

    /**
     * Check whether redoing command is possible
     * @returns {boolean}
     */
    canRedo() {
        return this.sp < this.stack.length - 1; //if stack pointer is not at the end
    }

    /**
     * Change stack size limit initially defined in the constructor options
     * @param {number} limit
     */
    setLimit(limit) {
        let redoable = this.stack.length - this.sp - 1;

        if (limit < 1 || !(typeof limit === "number"))
            throw new TypeError(`JSUndoManager.setLimit(): unexpected argument limit=${limit}. Should be a positive number`);

        if (limit < redoable) {
            console.warn(`JSUndoManager.setLimit(): cannot set stack limit (${limit}) less than the number of 'redoable' commands (${redoable})`);
        } else {
            this.limit = Math.floor(limit);
            this._keepLimit();
        }

        return this;
    }

    /**
     * Reset all commands from memory
     */
    reset() {
        this.log("reset");
        this.stack = [];
        this.sp = -1;
        return this;
    }

    /**
     * Check whether the commands stack is empty
     * @returns {boolean}
     */
    isEmpty() {
        return !this.stack.length;
    }

    /**
     * Check whether the commands stack size reaches its limit
     * @returns {boolean}
     */
    isFull() {
        return this.stack.length === this.limit;
    }

    /**
     * Get number of commands in memory stack
     * @returns {Number}
     */
    getSize() {
        return this.stack.length;
    }

    log(msg, ...args) {
        if (this.options.debug)
            console.log(`Command Manager: ${msg}`, ...args);
    }
}

/**
 * Transaction manager helper.
 * Allows working with transactions from JSUndoManager. Requires its instance as a constructor's parameter.
 * @class TransactionManager
 */
class TransactionManager {
    static _execForward(sequence) {
        for (let i = 0; i < sequence.length; i++)
            sequence[i].redo();
    }

    static _execBack(sequence) {
        for (let i = sequence.length - 1; i >= 0; i--)
            sequence[i].undo();
    }

    constructor(tracker) {
        this.tracker = tracker;
        this._reset();
    }

    begin() {
        this.state = TransactionManager.IN_PROGRESS;
        this.tracker.log("Begin transaction");
    }

    end() {
        let seq = this.sequence;

        this._reset();

        if (seq.length > 0) {
            this.tracker.record({
                redo: TransactionManager._execForward.bind(null, seq),
                undo: TransactionManager._execBack.bind(null, seq)
            });
        }

        this.tracker.log("End transaction");
    }

    cancel() {
        TransactionManager._execBack(this.sequence);
        this._reset();

        this.tracker.log("Cancel transaction");
    }

    isInProgress() {
        return this.state === TransactionManager.IN_PROGRESS;
    }

    isPending() {
        return this.state === TransactionManager.PENDING;
    }

    _record(command) {
        this.sequence.push(command);
        this.tracker.log("Recording command in transaction...", command);
    }

    _reset() {
        this.state = TransactionManager.PENDING;
        this.sequence = [];
    }
}

TransactionManager.PENDING = 0;
TransactionManager.IN_PROGRESS = 1;

/////////// SOURCE CODE END ///////////////

// HELPER FUNCTIONS
/**
 * Emulate ES6 Object.assign behaviour if native function is not defined
 */
let assign = Object.assign || function (target) {
    for (let i = 1; i < arguments.length; i++ ) {
        for (let key in arguments[i]) {
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
    define(() => {
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