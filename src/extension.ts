import { existsSync, readdirSync } from "fs";
import { join } from "path";
import * as vscode from "vscode";

const EXTNAME = "binrun";
const DEFAULT_SUBDIRECTORIES = ["bin"];
const PREVIOUS = "previous";

var CONTEXT: vscode.ExtensionContext;

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

function makeOpt(subdir: string, file: string, template: string): Item {
  const path = join(subdir, file);
  const command = template.replace("{}", path);
  return { label: file, description: `execute '${path}'`, command: command };
}

function executeItem(item: vscode.QuickPickItem | undefined) {
  const i = item as Item;
  if (!i || !i.command || i.command.length === 0) {
    return;
  }
  const w = vscode.window;
  const term = w.activeTerminal || w.createTerminal(EXTNAME);
  term.sendText(i.command);
  CONTEXT.workspaceState.update(PREVIOUS, i.label);
}

function sep(label: string): vscode.QuickPickItem {
  return { label: label, kind: vscode.QuickPickItemKind.Separator };
}

function showMenu(items: vscode.QuickPickItem[], previous: string | undefined) {
  if (previous) {
    // if something exists with the previous label, also put it first
    const prev = items.find((i) => i.label === previous);
    if (prev) {
      items = [sep("Recently executed"), prev, sep("")].concat(items);
    }
  }
  vscode.window.showQuickPick(items).then(executeItem);
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

  const items = getTasks(subdirs).map((t) => makeOpt(t[0], t[1], template));
  const previous = CONTEXT.workspaceState.get<string>(PREVIOUS);
  showMenu(items, previous);
}

export function activate(context: vscode.ExtensionContext) {
  CONTEXT = context;
  context.subscriptions.push(
    vscode.commands.registerCommand(`${EXTNAME}.show`, show)
  );
}
