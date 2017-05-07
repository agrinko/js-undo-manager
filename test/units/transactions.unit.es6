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
