# binrun

*Binrun gives you a pick list of scripts in your workspace to execute*

## Features

- Provides a fuzzy pick list to execute scripts in your workspace
- Searches ./bin (user-configurable)
- Executes the command in the integrated terminal
- Configurable command template

I use the configurable command template to forward the command to [kitty](https://sw.kovidgoyal.net/kitty/) so I can launch commands in my terminal-of-choice.

## Extension Settings

This extension contributes the following settings:

* `binrun.commandTemplate`: a string template for each command
* `binrun.subDirectories`: set to an array of subdirectories ot search

## Known Issues

This is my first extension and I wrote it in one day.
I still want to add a few features. Feedback welcome!

## Todo

- Package and put on marketplace. For now, build with `vsce package` and install with `code --install-extension ...`

## Release Notes

### 0.9.0

First released version.
