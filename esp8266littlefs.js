const vscode = require('vscode');
const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const RED = "\u001b[31m";
const BOLD_RED = "\u001b[31;1m";
const RESET = "\u001b[0m";
const MAGENTA = "\u001b[35m";
const YELLOW = "\u001b[33m";
const BLUE = "\u001b[34m";

let outputChannel = null;
let logLevel = "normal"; // "normal", "verbose", "silent", "debug"

function log(message, color) {
	if (logLevel === "silent")
		return;

	if (color)
		console.log(`${color}${message}${RESET}`);
	else
		console.log(message);

	outputChannel.appendLine(message.replace(/\x1b\[[\d|\;]{1,4}m/g, ""));
	outputChannel.show();
}

function logImportant(message) {log(message, RED);}
function logCommand(message) {log(message, YELLOW);}
function logLittlefs(message) {log(`  [LITTLEFS] ${message}`, BLUE);}
function logError(message) {log(message, BOLD_RED);}


function logVerbose(message) {
	if (logLevel === "verbose" || logLevel === "debug")
		log(message, MAGENTA);
}

function uploadLittlefsEspTool(_path, port, image) {

}

function downloadLittlefsEspTool(_path, port, image, options, target) {

}

function stringToInt(value) {
	return parseInt(value, value.match(/^0x/i) ? 16 : 10);
}

function makeMklittlefsArgs(args) {
	args.push("--all-files");
	args.unshift("--debug");
	return args;
}

function makeOsPath(dir) {
	dir = dir.replace(/\\/g, "/");

	if (dir.indexOf(" ") != -1)
		dir = `"${dir}"`;

	return dir;
}


function runCommand(command, args) {
	logVerbose("Running: " + command + " " + args.join(" "));

	const spawn = childProcess.spawnSync(command, args, {encoding: "utf8"});

	if (spawn.error)
		log(spawn.error);

	spawn.stdout
		.toString()
		.replace(/\r\n/, "\n")
		.split("\n")
		.forEach(line => logCommand(line.trimRight()));

	spawn.stderr
		.toString()
		.replace(/\r\n/, "\n")
		.split("\n")
		.forEach(line => logError(line.trimRight()));

	if (spawn.status)
		log(`${command} returned ${spawn.status}`);

	return spawn.stdout.toString();
}

function packLittlefs(mklittlefs, _path, image, options) {
	log(`--- Packing LITTLEFS file ---`);
	const dataSize = options.dataSize;
	const dataSizeInK = (dataSize >> 10) + 1;
	const spiPage = stringToInt(options.pageSize || "256");
	const spiBlock = stringToInt(options.blockSize || "4096");

	logImportant(`LITTLEFS Creating Image... (${image})`);
	logLittlefs(`program: ${mklittlefs}`);
	logLittlefs(`data   : ${_path}`);
	logLittlefs(`size   : ${dataSize}`);
	logLittlefs(`size   : ${dataSizeInK}K`);
	logLittlefs(`page   : ${spiPage}`);
	logLittlefs(`block  : ${spiBlock}`);
	const args =
		makeMklittlefsArgs([
			"--create", makeOsPath(_path),
			"--size", dataSize,
			"--page", spiPage,
			"--block", spiBlock,
			makeOsPath(image)
		]);
	log(`RunCommand:`);
	log(makeOsPath(mklittlefs));
	log(args.join(" "));
	runCommand(
		makeOsPath(mklittlefs), args
	);
	log(`--- Finished packing LITTLEFS file ---`);
}

function unpackLittlefs() {

}

function listLittlefs() {

}

function visualizeLittlefs() {

}

function getTarget() {
	return {
		flashSize: "1M256",
		flashMode: "dout",
		flashFreq: "40"
	};
}

function getPort() {
	return "COM6";
}

function getDataFilesPath() {
	return "./data";
}

function fileExists(file) {
	try {
		return fs.statSync(file).isFile();
	}
	catch (e) {
		return false;
	}
}

function getMkLittlefs() {
	const mklittlefs = "C:/Users/sciensa/AppData/Local/Arduino15/packages/esp8266/tools/mklittlefs/3.0.4-gcc10.3-1757bed/mklittlefs.exe";
	if (!fileExists(mklittlefs))
		logError(`"Can't locate "${mklittlefs}"`);
	return mklittlefs;
}

function getLittlefsOptions(target) {
	const littlefsOptions = {};

	readLines(path.join(packagesPath, "boards.txt"))
		.forEach(line => {
			const match = line.match(`${target.board}\\.(?:build|upload)\\.(\\S+)=(\\S+)`)
				|| line.match(`${target.board}\\.menu\\.eesz\\.${target.flashSize}\\.(?:build|upload)\\.(\\S+)=(\\S+)`)
				|| line.match(`${target.board}\\.menu\\.PartitionScheme\\.${arduinoJson.PartitionScheme}\\.(?:build|upload)\\.(\\S+)=(\\S+)`);

			if (match)
				littlefsOptions[match[1]] = match[2];
		}
		);

	if (!littlefsOptions.spiffs_start)
		throw `Missing "spiffs_start" definition: target = ${target.architecture}, config = ${target.memoryConfig}.`;

	if (!littlefsOptions.spiffs_end)
		throw `Missing "spiffs_end" definition: target = ${target.architecture}, config = ${target.memoryConfig}.`;

	littlefsOptions.dataSize = (stringToInt(littlefsOptions.spiffs_end) - stringToInt(littlefsOptions.spiffs_start)).toString();
	littlefsOptions.flashMode = preferences.flash_mode;
	littlefsOptions.flashFreq = preferences.flash_freq;
	littlefsOptions.flashSize = "0x" + toHex(stringToInt(littlefsOptions.spiffs_start) + stringToInt(littlefsOptions.dataSize));

	return littlefsOptions;
}

function executeLittlefs(action) {
	const _path = getDataFilesPath();
	const target = getTarget();
	const port = getPort();
	const options = getOptions(target);

	log(`Action selected: ${action}`);
	switch (action) {
		case "upload":
			log("Starting upload");
			break;
		case "download":
			log("Starting download");
			break;
		case "pack":
			log("Starting pack");
			packLittlefs(getMkLittlefs(), _path, "", options);
			break;
		case "unpack":
			log("Starting unpack");
			break;
		case "list":
			log("Starting list");
			break;
		case "visualize":
			log("Starting visualize");
			break;
	}
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	outputChannel = vscode.window.createOutputChannel("ESP8266FS");
	//logLevel = getVscodeConfigValue(ESP8266FS_LOGLEVEL) || "normal";
	logVerbose(`ESP8266FS is now active!`);

	context.subscriptions.push(vscode.commands.registerCommand('esp8266littlefs.uploadLittlefs', () => {executeLittlefs("upload");}));
	context.subscriptions.push(vscode.commands.registerCommand('esp8266littlefs.downloadLittlefs', () => {executeLittlefs("download");}));
	context.subscriptions.push(vscode.commands.registerCommand('esp8266littlefs.packLittlefs', () => {executeLittlefs("pack");}));
	context.subscriptions.push(vscode.commands.registerCommand('esp8266littlefs.unpackLittlefs', () => {executeLittlefs("unpack");}));
	context.subscriptions.push(vscode.commands.registerCommand('esp8266littlefs.listLittlefs', () => {executeLittlefs("list");}));
	context.subscriptions.push(vscode.commands.registerCommand('esp8266littlefs.visualizeLittlefs', () => {executeLittlefs("visualize");}));
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
