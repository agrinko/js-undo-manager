describe("Command Manager", () => {
    describe("initial state", () => {
        let cm = new JSUndoManager();

        it("isEmpty() should return true", () => {
            cm.isEmpty().should.be.true;
        });

        it("isFull() should return false", () => {
            cm.isFull().should.be.false;
        });

        it("getSize() should return 0", () => {
            cm.getSize().should.equal(0);
        });

        it("canUndo() should return false", () => {
            cm.canUndo().should.be.false;
        });

        it("canRedo() should return false", () => {
            cm.canRedo().should.be.false;
        });

        it("undo() should return self and not change state", () => {
            cm.undo().should.equal(cm);
            cm.isEmpty().should.be.true;
        });

        it("redo() should return self and not change state", () => {
            cm.redo().should.equal(cm);
            cm.isEmpty().should.be.true;
        });

        it("reset() should return self and not change state", () => {
            cm.reset().should.equal(cm);
            cm.isEmpty().should.be.true;
        });

        it("setLimit(20) should return self", () => {
            cm.setLimit(20).should.equal(cm);
        });

        it("setLimit() should throw", () => {
            cm.setLimit.bind(cm).should.throw(TypeError);
        });

        it("setLimit(0) should throw", () => {
            cm.setLimit.bind(cm, 0).should.throw(TypeError);
        });

        it("setLimit(-2) should throw", () => {
            cm.setLimit.bind(cm, -2).should.throw(TypeError);
        });

        it("setLimit(1.5) should not throw", () => {
            cm.setLimit.bind(cm, 1.5).should.not.throw(TypeError);
        });
    });

    describe("recording commands", () => {
        let cm = new JSUndoManager();

        it("record() should throw", () => {
            cm.record.bind(cm).should.throw(TypeError);
        });

        it("record(new Function) should throw", () => {
            cm.record.bind(cm, new Function).should.throw(TypeError);
        });

        it("record({undo: new Function}) should throw", () => {
            cm.record.bind(cm, {undo: new Function}).should.throw(TypeError);
        });

        it("record({undo: new Function, redo: new Function}) should not throw", () => {
            cm.record.bind(cm, {
                undo: new Function,
                redo: new Function
            }).should.not.throw(TypeError);
        });

        it("record(new Function, new Function) should not throw", () => {
            cm.record.bind(cm, new Function, new Function).should.not.throw(TypeError);
        });

        it("should have size of 2 after two records", () => {
            cm.getSize().should.equal(2);
        });

        it("isEmpty() should return false", () => {
            cm.isEmpty().should.be.false;
        });

        it("canRedo() should return false", () => {
            cm.canRedo().should.be.false;
        });

        it("canUndo() should return true", () => {
            cm.canUndo().should.be.true;
        });

        it("should become empty after reset", () => {
            cm.reset().isEmpty().should.be.true;
            cm.canUndo().should.be.false;
        });

        it("execute() should throw", () => {
            cm.execute.bind(cm).should.throw(TypeError);
        });

        it("execute(new Function) should throw", () => {
            cm.execute.bind(cm, new Function).should.throw(TypeError);
        });

        it("execute(fun1, fun2) should execute a function and record it", () => {
            let fun1 = sinon.spy();

            cm.execute(fun1, new Function).getSize().should.equal(1);
            cm.canUndo().should.be.true;
            fun1.calledOnce.should.be.true;
        });
    });

    describe("undoing and redoing", () => {
        let cm = new JSUndoManager();
        let i = 0;
        let decrement = () => {
            i--;
        };
        let increment = () => {
            i++;
        };

        it("should record 2 increment commands", () => {
            increment();
            cm.record(increment, decrement);

            increment();
            cm.record(increment, decrement);

            cm.getSize().should.equal(2);
        });

        it("should decrement variable (only twice) using 'undo'", () => {
            cm.undo();
            i.should.equal(1);

            cm.undo();
            i.should.equal(0);

            cm.undo();
            i.should.equal(0);
        });

        it("should increment variable (only twice) using 'redo'", () => {
            cm.redo();
            i.should.equal(1);

            cm.redo();
            i.should.equal(2);

            cm.redo();
            i.should.equal(2);
        });

        it("execute(fn) should execute increment operation automatically", () => {
            cm.execute(increment, decrement);
            i.should.equal(3);

            cm.execute(increment, decrement);
            i.should.equal(4);
        });

        it("should not be able to 'redo' after 2 'undos' and a new record", () => {
            cm.undo().undo();
            i.should.equal(2);
            cm.canRedo().should.be.true;

            cm.execute(decrement, increment);
            i.should.equal(1);
            cm.canRedo().should.be.false;
        });

        it("should not be able to 'undo' after reset", () => {
            cm.reset().canUndo().should.be.false;
        });
    });

    describe("limits", () => {
        let limit = 10;
        let cm = new JSUndoManager({
            limit: limit
        });

        let noop = new Function;
        let fillCommands = (number) => {
            for (let i = number; i--;)
                cm.record(noop, noop);
        };

        it("should not get size greater than specified limit", () => {
            fillCommands(limit + 3);
            cm.getSize().should.equal(limit);
        });

        it("isFull() should return true now", () => {
            cm.isFull().should.be.true;
        });

        it("setLimit(limit+10) should extend stack limit", () => {
            limit += 10;
            cm.setLimit(limit);
            cm.isFull().should.be.false;
        });

        it("10 more commands should reach the limit", () => {
            fillCommands(9);
            cm.isFull().should.be.false;

            fillCommands(1);
            cm.isFull().should.be.true;
        });

        it("setLimit(limit-10) should reduce real stack size", () => {
            limit -= 10;
            cm.setLimit(limit);

            cm.getSize().should.equal(limit);
        });

        it("setLimit(1) should leave only 2 'undo' operation possible", () => {
            limit = 1;
            cm.setLimit(limit);

            cm.canUndo().should.be.true;
            cm.undo().canUndo().should.be.false;
        });

        it("should warn in console when trying to reduce limit by more than number of 'undoable' operations possible", () => {
            limit = 5;
            cm.setLimit(limit);
            fillCommands(limit);

            cm.undo().undo().undo(); //leave 3 "redoable" operations

            let sandbox = sinon.sandbox.create();
            let consoleWarn = sandbox.stub(window.console, "warn");

            cm.setLimit(2); //try setting limit 2, which is less than 3 "redoable" operations left
            consoleWarn.calledOnce.should.be.true;

            sandbox.restore();
        });
    });
});

describe("Transactions", () => {
    describe("execution in transactions", () => {
        let cm = new JSUndoManager();
        let i = 0;
        let decrement = () => {
            i--;
        };
        let increment = () => {
            i++;
        };

        it("should execute 2 functions recorded during transaction using `execute` function", () => {
            cm.transaction.begin();
            cm.execute(increment, decrement);
            cm.execute(increment, decrement);
            cm.transaction.end();
            i.should.equal(2);
        });

        it("stack size should equal 1", () => {
            cm.getSize().should.equal(1);
        });

        it("should undo 2 functions recorded during transaction with a single call", () => {
            cm.undo();
            i.should.equal(0);
        });

        it("should redo 2 previous functions with a single call", () => {
            cm.redo();
            i.should.equal(2);
        });

        it("single command + transaction of 3 commands + single command should execute 5 functions", () => {
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

        it("undo single command + undo transaction of 3 commands should revert 4 function", () => {
            cm.undo().undo();
            i.should.equal(1);
        });

        it("undo single command left should revert 1 function after all", () => {
            cm.undo();
            i.should.equal(0);
        });

        it("redo single command should execute 1 function", () => {
            cm.redo();
            i.should.equal(1);
        });

        it("redo transaction of 3 commands should execute 3 functions in a single call", () => {
            cm.redo();
            i.should.equal(4);
        });

        it("should record another one transaction of 2 functions", () => {
            cm.transaction.begin();
            cm.execute(increment, decrement);
            cm.execute(increment, decrement);
            cm.transaction.end();
            i.should.equal(6);
        });

        it("should revert 5 commands by undoing 2 previous transactions", () => {
            cm.undo().undo();
            i.should.equal(1);
        });

        it("should not record commands if empty transaction was closed", () => {
            cm.reset();

            cm.transaction.begin();
            cm.transaction.end();

            cm.getSize().should.equal(0);
            cm.canUndo().should.be.false;
        });
    });

    describe("cancelled transactions", () => {
        let cm = new JSUndoManager();
        let i = 0;
        let decrement = () => {
            i--;
        };
        let increment = () => {
            i++;
        };

        it("should execute 2 functions right off inside of transaction with `execute` command", () => {
            cm.transaction.begin();
            cm.execute(increment, decrement);
            cm.execute(increment, decrement);
            i.should.equal(2);
        });

        it("should revert recorded commands when transaction is cancelled", () => {
            cm.transaction.cancel();
            i.should.equal(0);
        });

        it("should forget recorded commands from cancelled transaction", () => {
            cm.canRedo().should.be.false;
            cm.canUndo().should.be.false;
            cm.getSize().should.equal(0);
        });
    });

    describe("transaction state functions", () => {
        let cm = new JSUndoManager();
        let i = 0;
        let decrement = () => {
            i--;
        };
        let increment = () => {
            i++;
        };

        it("transaction.isInProgress() should be false by default", () => {
            cm.transaction.isInProgress().should.be.false;
        });

        it("transaction.isInProgress() should return true when a transaction begins", () => {
            cm.transaction.begin();
            cm.transaction.isInProgress().should.be.true;
        });

        it("transaction.isInProgress() should return true after a command executed during transaction", () => {
            cm.execute(increment, decrement);
            cm.transaction.isInProgress().should.be.true;
        });

        it("transaction.isInProgress() should return false when a transaction is canceled", () => {
            cm.transaction.cancel();
            cm.transaction.isInProgress().should.be.false;
            i.should.equal(0);
        });

        it("transaction.isPending() should return true by default", () => {
            cm.transaction.isPending().should.be.true;
        });

        it("transaction.isPending() should return false during transaction", () => {
            cm.transaction.begin();
            cm.transaction.isPending().should.be.false;
        });

        it("transaction.isPending() should return true after transaction is finished", () => {
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
