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
import { promises as fs } from 'node:fs';
import { spawn } from 'child_process';



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
			//vscode.window.showInformationMessage('Hello World');
			createkey(acontext);
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('teensysecurity.step1', async () => {
			console.log('teensysecurity.step1 (Fuse Write Sketch) callback');
			createsketch(acontext, "hello");
			// TODO...
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('teensysecurity.step2', () => {
			console.log('teensysecurity.step2 (Verify Sketch) callback');
			// TODO...
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('teensysecurity.step3', () => {
			console.log('teensysecurity.step3 (Lock Security Sketch) callback');
			// TODO...
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

async function createsketch(acontext: ArduinoContext, sketchname: string) {

	const uri = vscode.Uri.file("/tmp/hello");
	vscode.commands.executeCommand('vscode.openFolder', uri , { forceNewWindow: true });


}

async function createkey(acontext: ArduinoContext) {
	console.log('createkey:');
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
	var child_process = require('child_process');
	var child = child_process.spawn(program, ['keygen', keyfile]);

	// as stdout and stderr arrive, send to the terminal
	child.stdout.on('data', function(data:string) {
		tprint(data);
	});
	child.stderr.on('data', function(data:string) {
		tprint(data); // TODO: red text like esp-exception decoder
	});

	//we're done here, but teensy_secure keygen and terminal keeps running
	//console.log('createkey: end');
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
	var child_process = require('child_process');
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
