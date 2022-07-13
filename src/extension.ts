import { existsSync, readdirSync } from "fs";
import { join } from "path";
import * as vscode from "vscode";

const EXTNAME = "binrun";
const DEFAULT_SUBDIRECTORIES = ["bin"];

interface Item extends vscode.QuickPickItem {
  command: string;
}

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

function makeOpt(subdir: string, file: string): Item {
  const path = join(subdir, file);
  return { label: file, description: `execute '${path}'`, command: path };
}

function showMenu(items: Item[], template: string) {
  vscode.window.showQuickPick(items).then((item) => {
    if (!item || !item.command || item.command.length === 0) {
      return;
    }
    const w = vscode.window;
    const term = w.activeTerminal || w.createTerminal(EXTNAME);
    const command = template.replace("{}", item.command);
    term.sendText(command);
  });
}

function show() {
  const config = vscode.workspace.getConfiguration(EXTNAME);
  const subdirs =
    config.get<string[]>("subDirectories") || DEFAULT_SUBDIRECTORIES;
  var template = config.get<string>("commandTemplate") || "";
  if (template.search("{}") === -1) {
    if (template.length > 0 && !template.endsWith(" ")) {
      template += " ";
    }
    template += "{}";
  }

  const items = getTasks(subdirs).map((t) => makeOpt(t[0], t[1]));
  showMenu(items, template);
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(`${EXTNAME}.show`, show)
  );
}
