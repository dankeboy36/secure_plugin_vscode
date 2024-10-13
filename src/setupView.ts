import * as vscode from 'vscode';

// See https://code.visualstudio.com/api/references/contribution-points#contributes.viewsWelcome
// Empty tree views can have a viewsWelcome that we use as a cheap hack to show static content with a few buttons backed by VS Code commands.
const alwaysEmptyTreeDataProvider: vscode.TreeDataProvider<unknown> = {
    getTreeItem() { return {}; },
    getChildren() { return []; },
};

export function activateSetupView(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.window.createTreeView('teensysecurity.setupView', { treeDataProvider: alwaysEmptyTreeDataProvider }),
    );
}
