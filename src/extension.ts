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

// Ctrl-Shift-P  Reload Window
// Ctrl-Shift-P  Hello World

// https://www.svgrepo.com/svg/34405/key


import * as vscode from 'vscode';
import type { Terminal, Pseudoterminal, ExtensionTerminalOptions } from 'vscode';
import type { ArduinoContext, BoardDetails } from 'vscode-arduino-api';
import * as path from 'path';
import * as fs from 'node:fs';
import * as child_process from 'child_process';
import { tmpdir } from 'node:os';


export function activate(context: vscode.ExtensionContext) {

	const acontext: ArduinoContext = vscode.extensions.getExtension(
		'dankeboy36.vscode-arduino-api'
	)?.exports;
	if (!acontext) {
		console.log('teensysecurity Failed to load the Arduino API');
		return;
	}
	context.subscriptions.push(
		vscode.commands.registerCommand('teensysecurity.createkey', () => {
			createKey(acontext);
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('teensysecurity.step1', async () => {
			console.log('teensysecurity.step1 (Fuse Write Sketch) callback');
			var mydir = createTempFolder("FuseWrite");
			makeCode(acontext, "fuseino", path.join(mydir, "FuseWrite.ino"));
			makeCode(acontext, "testdataino", path.join(mydir, "testdata.ino"));
			openSketch(mydir);
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('teensysecurity.step2', async () => {
			console.log('teensysecurity.step2 (Verify Sketch) callback');
			var mydir = createTempFolder("VerifySecure");
			makeCode(acontext, "verifyino", path.join(mydir, "VerifySecure.ino"));
			openSketch(mydir);
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('teensysecurity.step3', async () => {
			console.log('teensysecurity.step3 (Lock Security Sketch) callback');
			var mydir = createTempFolder("LockSecureMode");
			makeCode(acontext, "lockino", path.join(mydir, "LockSecureMode.ino"));
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

function makeCode(acontext: ArduinoContext, operation: string, pathname: string) : boolean {
	var keyfile = keyfilename(acontext);
	if (!keyfile) return false;
	var program = programpath(acontext);
	if (!program) return false;
	// https://stackoverflow.com/questions/14332721
	var child = child_process.spawnSync(program, [operation, keyfile]);
	if (child.error) return false;
	if (child.status != 0) return false;
	if (child.stdout.length <= 0) return false;
	fs.writeFileSync(pathname, child.stdout);
	return true;
}

async function openSketch(sketchpath: string) {
	// Thanks to dankeboy36
	// https://github.com/dankeboy36/vscode-arduino-api/discussions/16
	const uri = vscode.Uri.file(sketchpath);
	vscode.commands.executeCommand('vscode.openFolder', uri , { forceNewWindow: true });
}

async function createKey(acontext: ArduinoContext) {
	var keyfile = keyfilename(acontext);
	if (!keyfile) return;

	// create a function to print to the terminal (EventEmitter so non-intuitive)
	// https://code.visualstudio.com/api/references/vscode-api#EventEmitter&lt;T&gt;
	var wevent = new vscode.EventEmitter<string>();
	var isopen = false;
	var buffer:string = '';
	function tprint(s: string) : void {
		var s2 = String(s).replace(/\n/g, "\r\n")
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
	var program = programpath(acontext);
	if (!program) return undefined;
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

function programpath(acontext: ArduinoContext) : string | undefined {
	var tool = findTool(acontext, "runtime.tools.teensy-tools");
	if (!tool) return undefined;
	return tool + path.sep + 'teensy_secure';
}

function keyfilename(acontext: ArduinoContext) : string | undefined {
	var program = programpath(acontext);
	if (!program) return undefined;
	// https://stackoverflow.com/questions/14332721
	var child = child_process.spawnSync(program, ['keyfile']);
	if (child.error) return undefined;
	if (child.status != 0) return undefined;
	if (child.stdout.length <= 0) return undefined;
	var out:string = child.stdout.toString();
	var out2:string = out.replace(/\s+$/gm,''); // remove trailing newline
	return out2;
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
export function deactivate() {}
