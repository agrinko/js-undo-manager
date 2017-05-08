# JS Undo Manager

Simple JavaScript undo/redo command manager supporting transactions with no dependencies

Get more power into your app by controlling its execution process. Structurize your code
with distinct and isolated commands. Enhance users experience by letting them use
good old `Ctrl+Z`!

## Features

- No dependencies!
- Simple API to control execution
- OOP-style (`JSUndoManager` class with settings hash in constructor)
- Transactions support (executing several actions in a batch)
- Out-of-box binding to `Ctrl+Z`, `Ctrl+Y` and `Ctrl+Shift+Z` hot keys for simplest use-cases
- Source code in 3 samples: *ES 2015*, *ES 5.1* and *ES 5.1 minified*
- Importing via AMD, CommonJS or global object
- Fully tested

## Examples

Script can be imported either via AMD, CommonJS or global object. Below are some examples
of different kinds of import and usage.

With global-object method refer to `JSUndoManager` class name, though you can always alias
it yourself with a simpler name.

> Note! Some browsers support redo and undo by default in inputs when pressing `ctrl+z` & `ctrl+y`.
If you want to process them in a more flexible way and bind `undo` & `redo` actions to these shortcuts,
don't forget to prevent default browser's behaviour.

### Demo

Download the repo folder and open `demo.html` in your browser.

It uses some self-explaining examples to demonstrate the script's abilities.

### Basic usage

Example of usage in code (assuming you have imported the source file before running 
this):

```javascript
// CommonJS style
var UndoManager = require(`js-undo-manager`);

var um = new UndoManager();
var i = 0;

um.execute(increment, decrement); // `increment` will be executed right off
console.log(i); // i == 1

um.undo();
console.log(i); // i == 0

um.redo();
console.log(i); // i == 1

function increment() { i++; }
function decrement() { i--; }
```

### Transactions example

Example of transactions:

```javascript
// Global object

var undoManager = new JSUndoManager();
var i = 0;

// successful transaction example
undoManager.transaction.begin();
undoManager.execute(increment, decrement);
undoManager.execute(increment, decrement);
console.log(i); // i == 2

undoManager.transaction.end();
undoManager.undo();
console.log(i); // i == 0

undoManager.redo();
console.log(i); // i == 2

// canceled transaction example
undoManager.transaction.begin();
undoManager.execute(increment, decrement);
undoManager.execute(increment, decrement);
console.log(i); // i == 4

undoManager.transaction.cancel(); // revert and forget commands executed during transaction
console.log(i); // i == 2
console.log(`Stack size: ` + undoManager.getSize()); // stack size is 1

undoManager.undo();
console.log(i); // i == 0

function increment() { i++; }
function decrement() { i--; }
```

### The "record" method

JS Undo Manager supports 2 methods for recording your commands: `execute` and `record`.
The example of the former is given above. The latter works same way but doesn't execute
the command right off - it assumes it's been already executed before being recorded.

> An example of when `record` function might come in handy is when using events callbacks.
When a user entered some text into an input, browser updates its text automatically. You
just subscribe to the input's `change` event and record the change. When user un-does and 
re-does this action, the input's content should be updated programmatically. See example below:

```javascript
// Using global variable
var UM = window.JSUndoManager; // you can give any simple name to the class
var um = new UM({
  limit: 50, // limit of the history stack
  debug: true
});

var input = document.getElementById(`some-input`);
var prevValue = input.value; // way to know previous value after `change` event

input.addEventListener(`change`, function() {
    var prev = prevValue;
    var value = input.value;

    prevValue = value;

    um.record({
        redo: function() {
            input.value = value;
            // update previous value manually because we don't trigger `change` event here
            prevValue = value;
        },
        undo: function() {
            input.value = prev;
            prevValue = prev;
        }
    });
});
```

## Installation

### Using npm

`npm install agrinko/js-undo-manager --save`

Then in your JS code:

`require("js-undo-manager")`

This will require minified file as a dependency.

It's assumed to work with both CommonJS or AMD, but needs to be tested. Please communicate if you confirm.

### Using yarn

`yarn add agrinko/js-undo-manager`

Rest is the same as with npm.

### Simple download

Download one of the versions from [src](./src) directory (either [EcmaScript 6 full](./src/js-undo-manager.es6),
[EcmaScript 5 full](./src/js-undo-manager.js) or [EcmaScript 5 minified](./src/js-undo-manager.min.js)).

Attach the script anywhere on your page.

## Repository

If you want to contribute or research the repo, clone it and run `yarn install`
([read more](https://yarnpkg.com/lang/en/docs/install/) on how to download and install yarn).
You can also use `npm install` for quick testing if you're not going to commit changes.

Run `yarn build` each time you want to compile and minify ES6 source code.

Run `yarn test` to compile ES6 test files and run them in PhantomJS. Only after that you can open `test/index.html`
in browser to check results there.

## API

### Settings

#### limit: number

Default: `100`

Maximum size of the commands stack.

When commands stack reaches this number, with each new command, the oldest commands are cut off and forgotten, 
meaning you cannot undo them any more.

This value affects memory usage and can be adjusted in a wide range. It also can be updated dynamically after the 
command manager was initialized. Read more about `setLimit` method below.

#### debug: boolean

Default: `false`

Whether to emit execution status in console.

When turned on, Command Manager will log messages when recording commands, executing, undoing and redoing, etc.

#### bindHotKeys: boolean

Default: `false`

Whether to bind `undo` and `redo` commands to `Ctrl+Z`, `Ctrl+Y` & `Ctrl+Shift+Z` hot keys.

It is generally used for quick testing when you don't want to write `document.onkeydown` event handler manually.
For more advanced and flexible usage of hot keys this option should be turned off and replaced with a custom
implementation.

#### useTransactions: boolean

Default: `true`

Whether to initialize TransactionManager.

Turning this off might give some very slight increase in performance,
if you are sure you're not going to use transactions.

By default working with transactions is performed via `commandManager.transaction` reference, but it will be
undefined if this setting is turned off.

### Methods

Most method are designed to be used in chain by returning `this` each time, e.g:

```javascript
commandManager.setLimit(55).undo().undo();
```

#### record({redo: Function, undo: Function}): JSUndoManager

Alternative API: `record(Function, Function): JSUndoManager`

Record the command containing `redo` and `undo` functions.

With alternative API the first argument refers to `redo` and the second - to `undo` function.

Unlike with `execute` method, no functions are executed when calling `record`. See an example of when it might come in
handy in [the "record" method](#the-record-method) section above.

#### execute({redo: Function, undo: Function}): JSUndoManager

Alternative API: `execute(Function, Function): JSUndoManager`

Record the command containing `redo` and `undo` functions **and** execute the `redo` function immediately.

See examples of usage above in the [examples](#examples) section.

#### undo(): JSUndoManager

Undo the last executed command by calling its `undo` function.

Performs *no operation* if there is nothing to undo.

#### redo(): JSUndoManager

Redo the last "undone" command by calling its `redo` function.

Performs *no operation* if there is nothing to redo.

#### setLimit(number): JSUndoManager

Change stack size limit initially defined in the constructor options. Read more in [limit setting](#limit-number)
description.

If there are currently more commands in history stack than the specified number,
extra oldest ones will be removed and forgotten.

If there are currently more commands than the specified number that can be re-done with `redo` method, stack size
will not be changed and a warning will be emitted in console. We can't cut commands from stack that are above the
stack pointer (we only cut from tail).

#### reset(): JSUndoManager

Reset history stack entirely. The manager comes back to its initial state.

#### bindHotKeys(): JSUndoManager

Bind `undo` and `redo` commands to `Ctrl+Z`, `Ctrl+Y` & `Ctrl+Shift+Z` hot keys.

Read more in [bindHotKeys](#bindhotkeys-boolean) setting description above.

It can be called to bind the event handler dynamically when `bindHotKeys` setting was not set initially.

#### canUndo(): boolean

Check whether undoing is possible (i.e. if there is any command to undo).

#### canRedo(): boolean

Check whether redoing is possible (i.e. if there is any command to redo).

#### getSize(): number

Get number of commands in the history stack.

#### isEmpty(): boolean

Check whether the stack is empty.

#### isFull(): boolean

Check whether the stack is full (i.e. its size has reached the [limit](#limit-number)).

### Transactions

TransactionManager class is an extension over the JSUndoManager. It can be turned off by setting
`useTransactions: false` in the constructor (read more above).

Interaction with transactions is performed via `commandManager.transaction` reference (assuming "commandManager" is an 
instance of `JSUndoManager`). See [transactions example](#transactions-example) section above.

#### transaction.begin(): void

Set state of transaction to "in progress".

All the following commands will not be directly recorded in history stack but rather remembered in a transaction's 
`sequence` array.

Running this method when a transaction is already in progress doesn't make any change.

#### transaction.end(): void

Finish the transaction successfully.

All the transaction's commands are packed together in a sequence and recorded by JSUndoManager as a single command.

Running this method when there is no transaction in progress doesn't make any change.

#### transaction.cancel(): void

Cancel the transaction.

All the commands executed during the transaction are reverted by calling their `undo` functions in a reverse order.
No command is recorded by JSUndoManager.

Running this method when there is no transaction in progress doesn't make any change.

#### transaction.isInProgress(): boolean

Check whether there is a transaction in progress currently.

#### transaction.isPending(): boolean

Check if there is no transaction in progress currently.

The opposite of `transaction.isInProgress()`.

## TODO

- upload a plugin supporting js-undo-manager in BackboneJS
- set up code coverage
- extend transactions usage by using labels, etc.
- support events and/or callbacks for interaction

*Alexey Grinko, 2017 (c)*
