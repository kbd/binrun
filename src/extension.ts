import { readdirSync } from "fs";
import { join } from "path";
import * as vscode from "vscode";

const DEFAULT_SUBFOLDERS = ["bin"];

function getTasks() {
  var tasks: string[][] = [];
  vscode.workspace.workspaceFolders?.forEach((folder) => {
    const subfolders = DEFAULT_SUBFOLDERS; // todo: make config option

    subfolders.forEach((sub) => {
      const dir = join(folder.uri.fsPath, sub);
      const files = readdirSync(dir);
      files.forEach((path) => tasks.push([sub, path]));
    });
  });
  return tasks;
}

function makeOpt(subdir: string, file: string) {
  const path = join(subdir, file);
  return { label: file, description: `execute '${path}'`, command: path };
}

function showOptions() {
  var options = getTasks().map((task) => makeOpt(task[0], task[1]));
  vscode.window.showQuickPick(options).then((option) => {
    if (!option || !option.command || option.command.length === 0) {
      return;
    }
    var term =
      vscode.window.activeTerminal || vscode.window.createTerminal("binrun");
    term.sendText(option.command);
  });
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("binrun.show", showOptions)
  );
}

export function deactivate() {}
