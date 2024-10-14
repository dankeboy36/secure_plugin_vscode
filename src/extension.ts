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


import * as vscode from 'vscode';
import type { Terminal, ExtensionTerminalOptions } from 'vscode';
import type { ArduinoContext } from 'vscode-arduino-api';
import * as path from 'path';
import * as fs from 'node:fs';
import * as child_process from 'child_process';
import { tmpdir, platform } from 'node:os';
import { activateSetupView } from './setupView';


export function activate(context: vscode.ExtensionContext) {

	const acontext: ArduinoContext = vscode.extensions.getExtension(
		'dankeboy36.vscode-arduino-api'
	)?.exports;
	if (!acontext) {
		console.log('teensysecurity Failed to load the Arduino API');
		return;
	}

	activateSetupView(context);

	context.subscriptions.push(
		vscode.commands.registerCommand('teensysecurity.createKey', () => {
			var program = programpath(acontext);
			if (!program) {return;}
			var keyfile = keyfilename(program);
			if (!keyfile) {return;}
			createKey(program, keyfile);
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('teensysecurity.showKeyPath', () => {
			var program = programpath(acontext);
			if (!program) {return;}
			var keyfile = keyfilename(program);
			if (!keyfile) {return;}
			vscode.window.showInformationMessage('key.pem location: ' + keyfile);
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('teensysecurity.fuseWriteSketch', async () => {
			var program = programpath(acontext);
			if (!program) {return;}
			var keyfile = keyfilename(program);
			if (!keyfile) {return;}
			if (!keyfileexists(keyfile)) {return;}
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
			var program = programpath(acontext);
			if (!program) {return;}
			var keyfile = keyfilename(program);
			if (!keyfile) {return;}
			if (!keyfileexists(keyfile)) {return;}
			var mydir = createTempFolder("VerifySecure");
			makeCode(program, keyfile, "verifyino", path.join(mydir, "VerifySecure.ino"));
			openSketch(mydir);
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('teensysecurity.lockSecuritySketch', async () => {
			console.log('teensysecurity.lockSecuritySketch (Lock Security Sketch) callback');
			var program = programpath(acontext);
			if (!program) {return;}
			var keyfile = keyfilename(program);
			if (!keyfile) {return;}
			if (!keyfileexists(keyfile)) {return;}
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

function createTempFolder(sketchname: string) : string {
	var mytmpdir = fs.mkdtempSync(path.join(tmpdir(), 'teensysecure-'));
	var mydir:string = path.join(mytmpdir, sketchname);
	console.log("temporary sketch directory: " + mydir);
	fs.mkdirSync(mydir);
	return mydir;
}

function makeCode(program: string, keyfile: string, operation: string, pathname: string) : boolean {
	// https://stackoverflow.com/questions/14332721
	var child = child_process.spawnSync(program, [operation, keyfile]);
	if (child.error) {return false;}
	if (child.status != 0) {return false;}
	if (child.stdout.length <= 0) {return false;}
	fs.writeFileSync(pathname, child.stdout);
	return true;
}

async function openSketch(sketchpath: string) {
	// Thanks to dankeboy36
	// https://github.com/dankeboy36/vscode-arduino-api/discussions/16
	const uri = vscode.Uri.file(sketchpath);
	vscode.commands.executeCommand('vscode.openFolder', uri , { forceNewWindow: true });
}

async function createKey(program: string, keyfile: string) {
	// create a function to print to the terminal (EventEmitter so non-intuitive)
	// https://code.visualstudio.com/api/references/vscode-api#EventEmitter&lt;T&gt;
	var wevent = new vscode.EventEmitter<string>();
	var isopen = false;
	var buffer:string = '';
	function tprint(s: string) : void {
		var s2 = String(s).replace(/\n/g, "\r\n");
		if (isopen) {
			wevent.fire(s2);
		} else {
			buffer = buffer + s2;
		}
	};

	// open a terminal which will receive the keygen output messages
	// https://code.visualstudio.com/api/references/vscode-api#ExtensionTerminalOptions
	const opt : ExtensionTerminalOptions = {
		name: "New Key",
		pty: {
			onDidWrite: wevent.event,
			open: () => { isopen = true; wevent.fire(buffer); buffer = ''; },
			close: () => { isopen = false; buffer = ''; },
		}
	};
	const term : Terminal = (<any>vscode.window).createTerminal(opt);
	term.show();

	// start teensy_secure running with keygen
	var child = child_process.spawn(program, ['keygen', keyfile]);

	// as stdout and stderr arrive, send to the terminal
	child.stdout.on('data', function(data:string) {
		tprint(data);
	});
	child.stderr.on('data', function(data:string) {
		tprint(data); // TODO: red text like esp-exception decoder
	});

	//we're done here, but teensy_secure keygen and terminal keeps running
	//console.log('createKey: end');
}

// return the full pathname of the teensy_secure utility
//   calling functions should NOT store this, only use if for immediate needs
//   if Boards Manager is used to upgrade, downgrade or uninstall Teensy,
//   this pathname can be expected to change or even become undefined
function programpath(acontext: ArduinoContext) : string | undefined {
	var tool = findTool(acontext, "runtime.tools.teensy-tools");
	if (!tool) {
		vscode.window.showErrorMessage("Could not find teensy_secure utility.  Please select a Teensy board from the drop-down list or Tools > Port menu.");
		return undefined;
	}
	var filename = 'teensy_secure';
	if (platform() === 'win32') {filename += '.exe';}
	return path.join(tool, filename);
}

// get the full path to the user's key.pem file
//   calling functions should NOT store this, only use if for immediate needs
//   teensy_secure can look for key.pem in multiple locations and choose which
//   to use based on its internal rules.  If the user moves or deletes their
//   key.pem files, which file teensy_secure uses may change.
function keyfilename(program: string) : string | undefined {
	// https://stackoverflow.com/questions/14332721
	var child = child_process.spawnSync(program, ['keyfile']);
	if (child.error) {return undefined;}
	if (child.status != 0) {
		vscode.window.showErrorMessage("Found old version of teensy_secure utility.  Please use Boards Manager to install Teensy 1.60.0 or later.");
		return undefined;
	}
	if (child.stdout.length <= 0) {return undefined;}
	var out:string = child.stdout.toString();
	var out2:string = out.replace(/\s+$/gm,''); // remove trailing newline
	return out2;
}

function keyfileexists(keyfile: string) : boolean {
	if (fs.existsSync(keyfile)) {return true;}
	vscode.window.showErrorMessage('This command requires a key.pem file (' + keyfile + ').  Please use "Teensy Security: Generate Key" to create your key.pem file.');
	return false;
}

// from arduino-littlefs-upload
function findTool(ctx: ArduinoContext, match : string) : string | undefined {
    var found = false;
    var ret = undefined;
    if (ctx.boardDetails !== undefined) {
        Object.keys(ctx.boardDetails.buildProperties).forEach( (elem) => {
            if (elem.startsWith(match) && !found && (ctx.boardDetails?.buildProperties[elem] !== undefined)) {
                ret = ctx.boardDetails.buildProperties[elem];
                found = true;
            }
        });
    }
    return ret;
}



// This method is called when your extension is deactivated
//  TODO: should keep a list of all files create and delete them here
export function deactivate() {}
