import { accessSync, constants, existsSync, readdirSync } from "fs";
import { basename, dirname, join } from "path";
import * as vscode from "vscode";

const EXTNAME = "binrun";
const DEFAULT_SUBDIRECTORIES = ["bin"];
const PREVIOUS = "previous";

var CONTEXT: vscode.ExtensionContext;

interface Item extends vscode.QuickPickItem {
  path: string;
  dir: string;
  command: string;
}

function isValid(path: string): boolean {
  try {
    // why this api from accessSync?
    accessSync(path, constants.X_OK);
    return true;
  } catch (err) {
    return false;
  }
}

function getDirPaths(subdirs: string[]): Map<string, string[]> {
  const pathsByDir = new Map<string, string[]>();
  vscode.workspace.workspaceFolders?.forEach((folder) => {
    subdirs.forEach((sub) => {
      const dir = join(folder.uri.fsPath, sub);
      if (!existsSync(dir)) {
        return;
      }
      pathsByDir.set(
        sub,
        readdirSync(dir)
          .map((path) => join(dir, path))
          .filter(isValid)
      );
    });
  });
  return pathsByDir;
}

function makeOpt(subdir: string, path: string, template: string): Item {
  const file = basename(path);
  const relative = join(subdir, file);
  return {
    label: file,
    description: relative,
    path: path,
    dir: dirname(path),
    command: template.replace("{}", relative),
  };
}

function executeItem(item: vscode.QuickPickItem | undefined) {
  const i = item as Item;
  if (!i || !i.command || i.command.length === 0) {
    return;
  }
  const w = vscode.window;
  const term = w.activeTerminal || w.createTerminal(EXTNAME);
  term.sendText(i.command);
  CONTEXT.workspaceState.update(PREVIOUS, i.path);
}

function sep(label: string): vscode.QuickPickItem {
  return { label: label, kind: vscode.QuickPickItemKind.Separator };
}

function showMenu(items: vscode.QuickPickItem[], previous: string | undefined) {
  if (previous) {
    // if something exists with the previous label, also put it first
    const prev = items.find((i) => (i as Item).path === previous);
    if (prev) {
      items = [sep("Recently executed"), prev].concat(items);
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

  const items: vscode.QuickPickItem[] = [];
  getDirPaths(subdirs).forEach((paths, subdir) => {
    if (paths.length === 0) {
      return;
    }
    items.push(sep(subdir));
    paths.forEach((path) => {
      items.push(makeOpt(subdir, path, template));
    });
  });
  const previous = CONTEXT.workspaceState.get<string>(PREVIOUS);
  showMenu(items, previous);
}

export function activate(context: vscode.ExtensionContext) {
  CONTEXT = context;
  context.subscriptions.push(
    vscode.commands.registerCommand(`${EXTNAME}.show`, show)
  );
}
