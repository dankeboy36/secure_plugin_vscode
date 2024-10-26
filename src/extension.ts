// MIT License, see LICENSE.md

// https://github.com/arduino/arduino-ide/issues/58
// https://www.npmjs.com/package/vscode-arduino-api
// https://github.com/dankeboy36/vscode-arduino-api
// https://github.com/earlephilhower/arduino-littlefs-upload
// https://github.com/dankeboy36/esp-exception-decoder
// https://code.visualstudio.com/api/get-started/your-first-extension
// https://code.visualstudio.com/api

// Commands:
// yo code     <-- create skeleton hello world (place in ~/.arduinoIDE/plugins/helloworld)
// npm run compile

// Usage in Arduino IDE 2:

// Ctrl-Shift-P  Reload Window
// Ctrl-Shift-P  Teensy Security: Generate Key
// Ctrl-Shift-P  Teensy Security: Step 1 - Fuse Write Sketch
// Ctrl-Shift-P  Teensy Security: Step 2 - Verify Sketch
// Ctrl-Shift-P  Teensy Security: Step 3 - Lock Security Sketch

// https://www.svgrepo.com/svg/34405/key


import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import { platform, tmpdir } from 'node:os';
import * as path from 'node:path';
import type { ExtensionTerminalOptions, Terminal } from 'vscode';
import * as vscode from 'vscode';
import type { ArduinoContext, BoardDetails } from 'vscode-arduino-api';
import { activateSetupView } from './setupView';


// https://code.visualstudio.com/api/references/when-clause-contexts
function setWhenContext(contextKey: string, contextValue: unknown) {
	return vscode.commands.executeCommand('setContext', `teensysecurity.${contextKey}`, contextValue);
}

// The VS Code API for Arduino IDE supports the FQBN (Fully Qualified Board Name) of the currently selected board in two different ways:
// - fqbn (string|undefined) -> This is when the user selects a board from the dialog (it does not mean the platform is installed).
// - boardDetails?.fqbn (string|undefined) -> This is when a board has been selected by the user and the IDE runs the `board details` command. When the platform is not installed, this value will be undefined.
// Currently, it is not possible to retrieve any information from the CLI via the extension APIs, so extensions cannot check whether a particular platform is installed.
// Extensions can work around this by listening to both the FQBN (when the user selects a board) and board detail (when the IDE resolves the selected board via the CLI) change events.
// If the FQBN changes and is "teensy:avr," the extension knows that the currently selected board is a Teensy.
// If the board details are undefined, the extension can deduce that the platform is not yet installed.
// This trick works only when the Teensy platform is installed via the "Boards Manager" and the platform name arch is `teensy:avr`. If the FQBN starts with a different vendor-arch pair, the string matching will not work.
// Such when context values should be provided by vscode-arduino-api as a feature and IDEs should implement it: https://github.com/dankeboy36/vscode-arduino-api/issues/17.

let availabilityState:
	'selected' // when selected by user
	| 'installed' // when selected by user + board details is available
	| undefined  // rest (loading, other board is selected, etc.)
	= undefined;
let selectedBoardFqbn: string | undefined;

function activateWhenContext(arduinoContext: ArduinoContext): vscode.Disposable[] {
	updateTeensySelectedWhenContext(arduinoContext.fqbn);
	updateTeensyInstalledWhenContext(arduinoContext.boardDetails);
	updateHasKeyFileWhenContext(arduinoContext.boardDetails);
	return [
		arduinoContext.onDidChange('fqbn')(updateTeensySelectedWhenContext),
		arduinoContext.onDidChange('boardDetails')(updateTeensyInstalledWhenContext),
		arduinoContext.onDidChange('boardDetails')(updateHasKeyFileWhenContext),
	];
}

function updateTeensySelectedWhenContext(fqbn: string | undefined) {
	selectedBoardFqbn = fqbn;
	const isTeensy = selectedBoardFqbn?.startsWith('teensy:avr');
	if (availabilityState === 'installed' && isTeensy) {
		return;
	}
	availabilityState = isTeensy ? 'selected' : undefined;
	return setWhenContext('state', availabilityState);
}

function updateTeensyInstalledWhenContext(details: BoardDetails | undefined) {
	// board details change events always come after an FQBN change
	if (availabilityState === 'selected' && details?.fqbn?.startsWith('teensy:avr')) {
		availabilityState = 'installed';
		return setWhenContext('state', availabilityState);
	}
}

function updateHasKeyFileWhenContext(boardDetails: BoardDetails | undefined) {
	if (boardDetails?.fqbn.startsWith('teensy:avr')) {
		const program = programPath(boardDetails, false);
		if (program) {
			const keyPath = keyFilename(program);
			if (keyPath) {
				setWhenContext('hasKeyFile', fs.existsSync(keyPath));
				return;
			}
		}
	}
	setWhenContext('hasKeyFile', undefined);
}

export function activate(context: vscode.ExtensionContext) {
	const arduinoContext: ArduinoContext = vscode.extensions.getExtension(
		'dankeboy36.vscode-arduino-api'
	)?.exports;
	if (!arduinoContext) {
		console.log('teensysecurity Failed to load the Arduino API');
		return;
	}

	activateSetupView(context);

	context.subscriptions.push(
		...activateWhenContext(arduinoContext),
		vscode.commands.registerCommand('teensysecurity.createKey', () => {
			var program = programPath(arduinoContext.boardDetails);
			if (!program) { return; }
			var keyfile = keyFilename(program);
			if (!keyfile) { return; }
			createKey(program, keyfile);
			setWhenContext('hasKeyFile', true); // trigger a when context update after the command execution
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('teensysecurity.showKeyPath', async () => {
			var program = programPath(arduinoContext.boardDetails);
			if (!program) { return; }
			var keyfile = keyFilename(program);
			if (!keyfile) { return; }
			const openKeyFileAction = 'Open Key File';
			const actions = [];
			if (fs.existsSync(keyfile)) {
				actions.push(openKeyFileAction);
			}
			const action = await vscode.window.showInformationMessage('key.pem location: ' + keyfile, ...actions);
			if (action === openKeyFileAction) {
				vscode.commands.executeCommand('vscode.open', vscode.Uri.file(keyfile));
			}
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('teensysecurity.fuseWriteSketch', async () => {
			var program = programPath(arduinoContext.boardDetails);
			if (!program) { return; }
			var keyfile = keyFilename(program);
			if (!keyfile) { return; }
			if (!keyfileexists(keyfile)) { return; }
			console.log('teensysecurity.fuseWriteSketch (Fuse Write Sketch) callback');
			var mydir = createTempFolder("FuseWrite");
			makeCode(program, keyfile, "fuseino", path.join(mydir, "FuseWrite.ino"));
			makeCode(program, keyfile, "testdataino", path.join(mydir, "testdata.ino"));
			openSketch(mydir);
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('teensysecurity.verifySketch', async () => {
			console.log('teensysecurity.verifySketch (Verify Sketch) callback');
			var program = programPath(arduinoContext.boardDetails);
			if (!program) { return; }
			var keyfile = keyFilename(program);
			if (!keyfile) { return; }
			if (!keyfileexists(keyfile)) { return; }
			var mydir = createTempFolder("VerifySecure");
			makeCode(program, keyfile, "verifyino", path.join(mydir, "VerifySecure.ino"));
			openSketch(mydir);
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('teensysecurity.lockSecuritySketch', async () => {
			console.log('teensysecurity.lockSecuritySketch (Lock Security Sketch) callback');
			var program = programPath(arduinoContext.boardDetails);
			if (!program) { return; }
			var keyfile = keyFilename(program);
			if (!keyfile) { return; }
			if (!keyfileexists(keyfile)) { return; }
			var mydir = createTempFolder("LockSecureMode");
			makeCode(program, keyfile, "lockino", path.join(mydir, "LockSecureMode.ino"));
			openSketch(mydir);
		})
	);
	/*  not working, but why???
	acontext.onDidChangeSketch((event) => {
		if (event.changedProperties.includes('board')) {
			//console.log(`FQBN: ${event.object.board?.fqbn}`);
			vscode.window.showInformationMessage(`FQBN: ${event.object.board?.fqbn}`);
		}
	}); */
	//if (x.boardDetails !== undefined) {

	console.log('extension "teensysecurity" is now active!');
}

function createTempFolder(sketchname: string): string {
	var mytmpdir = fs.mkdtempSync(path.join(tmpdir(), 'teensysecure-'));
	var mydir: string = path.join(mytmpdir, sketchname);
	console.log("temporary sketch directory: " + mydir);
	fs.mkdirSync(mydir);
	return mydir;
}

function makeCode(program: string, keyfile: string, operation: string, pathname: string): boolean {
	// https://stackoverflow.com/questions/14332721
	var child = cp.spawnSync(program, [operation, keyfile]);
	if (child.error) { return false; }
	if (child.status !== 0) { return false; }
	if (child.stdout.length <= 0) { return false; }
	fs.writeFileSync(pathname, child.stdout);
	return true;
}

async function openSketch(sketchpath: string) {
	// Thanks to dankeboy36
	// https://github.com/dankeboy36/vscode-arduino-api/discussions/16
	const uri = vscode.Uri.file(sketchpath);
	vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: true });
}

async function createKey(program: string, keyfile: string) {
	// create a function to print to the terminal (EventEmitter so non-intuitive)
	// https://code.visualstudio.com/api/references/vscode-api#EventEmitter&lt;T&gt;
	var wevent = new vscode.EventEmitter<string>();
	var isopen = false;
	var buffer: string = '';
	function tprint(s: string): void {
		var s2 = String(s).replace(/\n/g, "\r\n");
		if (isopen) {
			wevent.fire(s2);
		} else {
			buffer = buffer + s2;
		}
	};

	// open a terminal which will receive the keygen output messages
	// https://code.visualstudio.com/api/references/vscode-api#ExtensionTerminalOptions
	const opt: ExtensionTerminalOptions = {
		name: "New Key",
		pty: {
			onDidWrite: wevent.event,
			open: () => { isopen = true; wevent.fire(buffer); buffer = ''; },
			close: () => { isopen = false; buffer = ''; },
		}
	};
	const term: Terminal = (<any>vscode.window).createTerminal(opt);
	term.show();

	// start teensy_secure running with keygen
	var child = cp.spawn(program, ['keygen', keyfile]);

	// as stdout and stderr arrive, send to the terminal
	child.stdout.on('data', function (data: string) {
		tprint(data);
	});
	child.stderr.on('data', function (data: string) {
		tprint(data); // TODO: red text like esp-exception decoder
	});

	//we're done here, but teensy_secure keygen and terminal keeps running
	//console.log('createKey: end');
}

// return the full pathname of the teensy_secure utility
//   calling functions should NOT store this, only use if for immediate needs
//   if Boards Manager is used to upgrade, downgrade or uninstall Teensy,
//   this pathname can be expected to change or even become undefined
function programPath(boardDetails: BoardDetails | undefined, showsErrorMessage = true): string | undefined {
	var tool = findTool(boardDetails, "runtime.tools.teensy-tools");
	if (!tool) {
		if (showsErrorMessage) {
			vscode.window.showErrorMessage("Could not find teensy_secure utility.  Please select a Teensy board from the drop-down list or Tools > Port menu.");
		}
		return undefined;
	}
	var filename = 'teensy_secure';
	if (platform() === 'win32') { filename += '.exe'; }
	return path.join(tool, filename);
}

// get the full path to the user's key.pem file
//   calling functions should NOT store this, only use if for immediate needs
//   teensy_secure can look for key.pem in multiple locations and choose which
//   to use based on its internal rules.  If the user moves or deletes their
//   key.pem files, which file teensy_secure uses may change.
function keyFilename(program: string): string | undefined {
	// https://stackoverflow.com/questions/14332721
	var child = cp.spawnSync(program, ['keyfile']);
	if (child.error) { return undefined; }
	if (child.status !== 0) {
		vscode.window.showErrorMessage("Found old version of teensy_secure utility.  Please use Boards Manager to install Teensy 1.60.0 or later.");
		return undefined;
	}
	if (child.stdout.length <= 0) { return undefined; }
	var out: string = child.stdout.toString();
	var out2: string = out.replace(/\s+$/gm, ''); // remove trailing newline
	return out2;
}

function keyfileexists(keyfile: string): boolean {
	if (fs.existsSync(keyfile)) { return true; }
	vscode.window.showErrorMessage('This command requires a key.pem file (' + keyfile + ').  Please use "Teensy Security: Generate Key" to create your key.pem file.');
	return false;
}

// from arduino-littlefs-upload
function findTool(boardDetails: BoardDetails | undefined, match: string): string | undefined {
	var found = false;
	var ret = undefined;
	if (boardDetails !== undefined) {
		Object.keys(boardDetails.buildProperties).forEach((elem) => {
			if (elem.startsWith(match) && !found && (boardDetails?.buildProperties[elem] !== undefined)) {
				ret = boardDetails.buildProperties[elem];
				found = true;
			}
		});
	}
	return ret;
}



// This method is called when your extension is deactivated
//  TODO: should keep a list of all files create and delete them here
export function deactivate() { }
