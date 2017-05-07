"use strict";

describe("Command Manager", function () {
    describe("initial state", function () {
        var cm = new JSUndoManager();

        it("isEmpty() should return true", function () {
            cm.isEmpty().should.be.true;
        });

        it("isFull() should return false", function () {
            cm.isFull().should.be.false;
        });

        it("getSize() should return 0", function () {
            cm.getSize().should.equal(0);
        });

        it("canUndo() should return false", function () {
            cm.canUndo().should.be.false;
        });

        it("canRedo() should return false", function () {
            cm.canRedo().should.be.false;
        });

        it("undo() should return self and not change state", function () {
            cm.undo().should.equal(cm);
            cm.isEmpty().should.be.true;
        });

        it("redo() should return self and not change state", function () {
            cm.redo().should.equal(cm);
            cm.isEmpty().should.be.true;
        });

        it("reset() should return self and not change state", function () {
            cm.reset().should.equal(cm);
            cm.isEmpty().should.be.true;
        });

        it("setLimit(20) should return self", function () {
            cm.setLimit(20).should.equal(cm);
        });

        it("setLimit() should throw", function () {
            cm.setLimit.bind(cm).should.throw(TypeError);
        });

        it("setLimit(0) should throw", function () {
            cm.setLimit.bind(cm, 0).should.throw(TypeError);
        });

        it("setLimit(-2) should throw", function () {
            cm.setLimit.bind(cm, -2).should.throw(TypeError);
        });

        it("setLimit(1.5) should not throw", function () {
            cm.setLimit.bind(cm, 1.5).should.not.throw(TypeError);
        });
    });

    describe("recording commands", function () {
        var cm = new JSUndoManager();

        it("record() should throw", function () {
            cm.record.bind(cm).should.throw(TypeError);
        });

        it("record(new Function) should throw", function () {
            cm.record.bind(cm, new Function()).should.throw(TypeError);
        });

        it("record({undo: new Function}) should throw", function () {
            cm.record.bind(cm, { undo: new Function() }).should.throw(TypeError);
        });

        it("record({undo: new Function, redo: new Function}) should not throw", function () {
            cm.record.bind(cm, {
                undo: new Function(),
                redo: new Function()
            }).should.not.throw(TypeError);
        });

        it("record(new Function, new Function) should not throw", function () {
            cm.record.bind(cm, new Function(), new Function()).should.not.throw(TypeError);
        });

        it("should have size of 2 after two records", function () {
            cm.getSize().should.equal(2);
        });

        it("isEmpty() should return false", function () {
            cm.isEmpty().should.be.false;
        });

        it("canRedo() should return false", function () {
            cm.canRedo().should.be.false;
        });

        it("canUndo() should return true", function () {
            cm.canUndo().should.be.true;
        });

        it("should become empty after reset", function () {
            cm.reset().isEmpty().should.be.true;
            cm.canUndo().should.be.false;
        });

        it("execute() should throw", function () {
            cm.execute.bind(cm).should.throw(TypeError);
        });

        it("execute(new Function) should throw", function () {
            cm.execute.bind(cm, new Function()).should.throw(TypeError);
        });

        it("execute(fun1, fun2) should execute a function and record it", function () {
            var fun1 = sinon.spy();

            cm.execute(fun1, new Function()).getSize().should.equal(1);
            cm.canUndo().should.be.true;
            fun1.calledOnce.should.be.true;
        });
    });

    describe("undoing and redoing", function () {
        var cm = new JSUndoManager();
        var i = 0;
        var decrement = function decrement() {
            i--;
        };
        var increment = function increment() {
            i++;
        };

        it("should record 2 increment commands", function () {
            increment();
            cm.record(increment, decrement);

            increment();
            cm.record(increment, decrement);

            cm.getSize().should.equal(2);
        });

        it("should decrement variable (only twice) using 'undo'", function () {
            cm.undo();
            i.should.equal(1);

            cm.undo();
            i.should.equal(0);

            cm.undo();
            i.should.equal(0);
        });

        it("should increment variable (only twice) using 'redo'", function () {
            cm.redo();
            i.should.equal(1);

            cm.redo();
            i.should.equal(2);

            cm.redo();
            i.should.equal(2);
        });

        it("execute(fn) should execute increment operation automatically", function () {
            cm.execute(increment, decrement);
            i.should.equal(3);

            cm.execute(increment, decrement);
            i.should.equal(4);
        });

        it("should not be able to 'redo' after 2 'undos' and a new record", function () {
            cm.undo().undo();
            i.should.equal(2);
            cm.canRedo().should.be.true;

            cm.execute(decrement, increment);
            i.should.equal(1);
            cm.canRedo().should.be.false;
        });

        it("should not be able to 'undo' after reset", function () {
            cm.reset().canUndo().should.be.false;
        });
    });

    describe("limits", function () {
        var limit = 10;
        var cm = new JSUndoManager({
            limit: limit
        });

        var noop = new Function();
        var fillCommands = function fillCommands(number) {
            for (var i = number; i--;) {
                cm.record(noop, noop);
            }
        };

        it("should not get size greater than specified limit", function () {
            fillCommands(limit + 3);
            cm.getSize().should.equal(limit);
        });

        it("isFull() should return true now", function () {
            cm.isFull().should.be.true;
        });

        it("setLimit(limit+10) should extend stack limit", function () {
            limit += 10;
            cm.setLimit(limit);
            cm.isFull().should.be.false;
        });

        it("10 more commands should reach the limit", function () {
            fillCommands(9);
            cm.isFull().should.be.false;

            fillCommands(1);
            cm.isFull().should.be.true;
        });

        it("setLimit(limit-10) should reduce real stack size", function () {
            limit -= 10;
            cm.setLimit(limit);

            cm.getSize().should.equal(limit);
        });

        it("setLimit(1) should leave only 2 'undo' operation possible", function () {
            limit = 1;
            cm.setLimit(limit);

            cm.canUndo().should.be.true;
            cm.undo().canUndo().should.be.false;
        });

        it("should warn in console when trying to reduce limit by more than number of 'undoable' operations possible", function () {
            limit = 5;
            cm.setLimit(limit);
            fillCommands(limit);

            cm.undo().undo().undo(); //leave 3 "redoable" operations

            var sandbox = sinon.sandbox.create();
            var consoleWarn = sandbox.stub(window.console, "warn");

            cm.setLimit(2); //try setting limit 2, which is less than 3 "redoable" operations left
            consoleWarn.calledOnce.should.be.true;

            sandbox.restore();
        });
    });
});

describe("Transactions", function () {
    describe("execution in transactions", function () {
        var cm = new JSUndoManager();
        var i = 0;
        var decrement = function decrement() {
            i--;
        };
        var increment = function increment() {
            i++;
        };

        it("should execute 2 functions recorded during transaction using `execute` function", function () {
            cm.transaction.begin();
            cm.execute(increment, decrement);
            cm.execute(increment, decrement);
            cm.transaction.end();
            i.should.equal(2);
        });

        it("stack size should equal 1", function () {
            cm.getSize().should.equal(1);
        });

        it("should undo 2 functions recorded during transaction with a single call", function () {
            cm.undo();
            i.should.equal(0);
        });

        it("should redo 2 previous functions with a single call", function () {
            cm.redo();
            i.should.equal(2);
        });

        it("single command + transaction of 3 commands + single command should execute 5 functions", function () {
            i = 0;

            cm.execute(increment, decrement);

            cm.transaction.begin();
            cm.execute(increment, decrement);
            cm.execute(increment, decrement);
            cm.execute(increment, decrement);
            cm.transaction.end();

            cm.execute(increment, decrement);
            i.should.equal(5);
        });

        it("undo single command + undo transaction of 3 commands should revert 4 function", function () {
            cm.undo().undo();
            i.should.equal(1);
        });

        it("undo single command left should revert 1 function after all", function () {
            cm.undo();
            i.should.equal(0);
        });

        it("redo single command should execute 1 function", function () {
            cm.redo();
            i.should.equal(1);
        });

        it("redo transaction of 3 commands should execute 3 functions in a single call", function () {
            cm.redo();
            i.should.equal(4);
        });

        it("should record another one transaction of 2 functions", function () {
            cm.transaction.begin();
            cm.execute(increment, decrement);
            cm.execute(increment, decrement);
            cm.transaction.end();
            i.should.equal(6);
        });

        it("should revert 5 commands by undoing 2 previous transactions", function () {
            cm.undo().undo();
            i.should.equal(1);
        });

        it("should not record commands if empty transaction was closed", function () {
            cm.reset();

            cm.transaction.begin();
            cm.transaction.end();

            cm.getSize().should.equal(0);
            cm.canUndo().should.be.false;
        });
    });

    describe("cancelled transactions", function () {
        var cm = new JSUndoManager();
        var i = 0;
        var decrement = function decrement() {
            i--;
        };
        var increment = function increment() {
            i++;
        };

        it("should execute 2 functions right off inside of transaction with `execute` command", function () {
            cm.transaction.begin();
            cm.execute(increment, decrement);
            cm.execute(increment, decrement);
            i.should.equal(2);
        });

        it("should revert recorded commands when transaction is cancelled", function () {
            cm.transaction.cancel();
            i.should.equal(0);
        });

        it("should forget recorded commands from cancelled transaction", function () {
            cm.canRedo().should.be.false;
            cm.canUndo().should.be.false;
            cm.getSize().should.equal(0);
        });
    });

    describe("transaction state functions", function () {
        var cm = new JSUndoManager();
        var i = 0;
        var decrement = function decrement() {
            i--;
        };
        var increment = function increment() {
            i++;
        };

        it("transaction.isInProgress() should be false by default", function () {
            cm.transaction.isInProgress().should.be.false;
        });

        it("transaction.isInProgress() should return true when a transaction begins", function () {
            cm.transaction.begin();
            cm.transaction.isInProgress().should.be.true;
        });

        it("transaction.isInProgress() should return true after a command executed during transaction", function () {
            cm.execute(increment, decrement);
            cm.transaction.isInProgress().should.be.true;
        });

        it("transaction.isInProgress() should return false when a transaction is canceled", function () {
            cm.transaction.cancel();
            cm.transaction.isInProgress().should.be.false;
            i.should.equal(0);
        });

        it("transaction.isPending() should return true by default", function () {
            cm.transaction.isPending().should.be.true;
        });

        it("transaction.isPending() should return false during transaction", function () {
            cm.transaction.begin();
            cm.transaction.isPending().should.be.false;
        });

        it("transaction.isPending() should return true after transaction is finished", function () {
            cm.transaction.end();
            cm.transaction.isPending().should.be.true;
        });
    });
});

if (window.mochaPhantomJS) {
    mochaPhantomJS.run();
} else {
    mocha.run();
}