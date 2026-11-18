const vscode = require('vscode');
const { createController } = require('./src/controller');

/** @type {ReturnType<typeof createController> | undefined} */
let controller;

/** @param {vscode.ExtensionContext} context */
function activate(context) {
    controller = createController(vscode);
    context.subscriptions.push(controller);
}

function deactivate() {
    controller?.dispose();
    controller = undefined;
}

module.exports = { activate, deactivate };
