import { existsSync, readdirSync } from "fs";
import { join } from "path";
import * as vscode from "vscode";

const EXTNAME = "binrun";
const DEFAULT_SUBDIRECTORIES = ["bin"];

function getTasks(subdirs: string[]) {
  var tasks: string[][] = [];
  vscode.workspace.workspaceFolders?.forEach((folder) => {
    subdirs.forEach((sub) => {
      const dir = join(folder.uri.fsPath, sub);
      if (!existsSync(dir)) {
        return;
      }
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
  const config = vscode.workspace.getConfiguration(EXTNAME);
  const subDirectories =
    config.get<string[]>("subDirectories") || DEFAULT_SUBDIRECTORIES;
  var commandTemplate = config.get<string>("commandTemplate") || "";
  if (commandTemplate.search("{}") === -1) {
    if (commandTemplate.length > 0 && !commandTemplate.endsWith(" ")) {
      commandTemplate += " ";
    }
    commandTemplate += "{}";
  }

  const options = getTasks(subDirectories).map((task) =>
    makeOpt(task[0], task[1])
  );
  vscode.window.showQuickPick(options).then((option) => {
    if (!option || !option.command || option.command.length === 0) {
      return;
    }
    const w = vscode.window;
    const term = w.activeTerminal || w.createTerminal(EXTNAME);
    const command = commandTemplate.replace("{}", option.command);
    term.sendText(command);
  });
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(`${EXTNAME}.show`, showOptions)
  );
}
