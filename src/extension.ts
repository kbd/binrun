import { readdirSync } from "fs";
import { join } from "path";
import * as vscode from "vscode";

const DEFAULT_SUBFOLDERS = ["bin"];

function getTasks(subfolders: string[]) {
  var tasks: string[][] = [];
  vscode.workspace.workspaceFolders?.forEach((folder) => {
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
  const config = vscode.workspace.getConfiguration("binrun");
  const subFolders = config.get<string[]>("subFolders") || DEFAULT_SUBFOLDERS;
  var commandTemplate = config.get<string>("commandTemplate") || "";
  if (commandTemplate.search("{}") === -1) {
    if (commandTemplate.length > 0 && !commandTemplate.endsWith(" ")) {
      commandTemplate += " ";
    }
    commandTemplate += "{}";
  }

  const options = getTasks(subFolders).map((task) => makeOpt(task[0], task[1]));
  vscode.window.showQuickPick(options).then((option) => {
    if (!option || !option.command || option.command.length === 0) {
      return;
    }
    const w = vscode.window;
    const term = w.activeTerminal || w.createTerminal("binrun");
    const command = commandTemplate.replace("{}", option.command);
    term.sendText(command);
  });
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("binrun.show", showOptions)
  );
}
