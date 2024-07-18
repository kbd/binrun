import { execFileSync } from "child_process";
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

// determine if the path is executable
function isValid(path: string): boolean {
  try {
    // why this api from accessSync?
    accessSync(path, constants.X_OK);
    return true;
  } catch (err) {
    return false;
  }
}

// get the paths to all the scripts in subdirs
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

// get just recipes as an array of tuples of (name, doc)
function getJustRecipes(): any[] {
  let recipes: any[] = [];
  const cmd = "just";
  const cmdArgs = ["--dump", "--dump-format=json"];
  try {
    // 'any' because getting 'no overload matches' for execArgs
    const cwd = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    const execArgs: any = { stdio: "pipe", encoding: "utf8", cwd: cwd };
    const stdout = execFileSync(cmd, cmdArgs, execArgs);
    // todo: way to distinguish between "no justfile in this project" and
    // an invalid justfile (to show an error in the picker)?
    const output = JSON.parse(stdout);
    Object.values(output["recipes"]).forEach((recipe: any) => {
      recipes.push({ name: recipe["name"], doc: recipe["doc"] });
    });
  } catch (err) {
    console.error(`Couldn't get just recipes: ${err}`);
  }
  return recipes;
}

// make a menu option
function makeBinOpt(subdir: string, path: string, template: string): Item {
  const file = basename(path);
  const relative = join(subdir, file);
  const cmd = template.replace("{}", relative);
  return makeOpt(file, relative, path, dirname(path), cmd);
}

// make just menu option
function makeJustOpt(name: string, doc: string, template: string): Item {
  const cmd = template.replace("{}", `just ${name}`);
  return makeOpt(name, doc, name, name, cmd);
}

function makeOpt(label: string, desc: string, path: string, dir: string, cmd: string) {
  return { label: label, description: desc, path: path, dir: dir, command: cmd };
}

// execute the chosen item
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

// make a menu separator
function sep(label: string): vscode.QuickPickItem {
  return { label: label, kind: vscode.QuickPickItemKind.Separator };
}

// show the quick pick
function show() {
  const config = vscode.workspace.getConfiguration(EXTNAME);
  const subdirs = config.get<string[]>("subDirectories") || DEFAULT_SUBDIRECTORIES;

  // configure the command template
  var template = config.get<string>("commandTemplate") || "";
  if (template.search("{}") === -1) {
    if (template.length > 0 && !template.endsWith(" ")) {
      template += " ";
    }
    template += "{}";
  }

  var items: vscode.QuickPickItem[] = [];

  // generate the quick pick items from subdirs
  getDirPaths(subdirs).forEach((paths, subdir) => {
    if (paths.length === 0) {
      return;
    }
    items.push(sep(subdir));
    paths.forEach((path) => {
      items.push(makeBinOpt(subdir, path, template));
    });
  });

  // generate the quick pick items from just
  const recipes = getJustRecipes();
  if (recipes.length > 0) {
    items.push(sep("just"));
    recipes.forEach(({ name: name, doc: doc }) => {
      items.push(makeJustOpt(name, doc, template));
    });
  }

  const previous = CONTEXT.workspaceState.get<string>(PREVIOUS);
  if (previous) {
    // if something exists with the previous label, also put it first
    const prev = items.find((i) => (i as Item).path === previous);
    if (prev) {
      prev.label = `$(play-circle) ${prev.label}`;
      items = [sep("Recently executed"), prev].concat(items);
    }
  }

  vscode.window.showQuickPick(items).then(executeItem);
}

// activate the extension
export function activate(context: vscode.ExtensionContext) {
  CONTEXT = context;
  context.subscriptions.push(vscode.commands.registerCommand(`${EXTNAME}.show`, show));
}
