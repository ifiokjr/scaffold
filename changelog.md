# Changelog

## [Unreleased](https://github.com/ifiokjr/scaffold/compare/0.2.0...HEAD)

### 💥 Breaking

- Remove `--name` and `--description` from options. `UserDetails` is a better API.

### ✨ Features

- Add `UserDetails` to the initial variables passed into the `scaffold.config.ts`. The new properties are `username`, `email`, `user` and `name`.

## 0.2.0

> [2022-06-28](https://github.com/ifiokjr/scaffold/compare/0.1.1...0.2.0)

### 💥 Breaking

- `--cache` has been renamed to `--cache-dir` and can be used to set a custom cache directory.
- Remove ~~`--log-level`~~ flag Use `--debug` instead to get debug logging.

### ✨ Features

- `https://deno.land/x/scaffold/scaffold.ts` is now the entry point for installing the CLI. All documentation has been updated to reflect this.
- Add new commands, `upgrade`, `help`, `completions` and `alias`.

  Setting up an alias can be done in the following way:

  ```bash
  scaffold alias deno ifiokjr/templates/deno
  ```

  Now you can use the `deno` alias to scaffold a project.

  ```bash
  scaffold deno my-project
  ```

  You can now upgrade the scaffold command to the latest version. You will also be prompted to upgrade the scaffold if a new version is available.

  ```bash
  scaffold upgrade
  ```

- Add support for `--cache-only` which allows you to only use the cache and not download anything.

## 0.1.1

> [2022-06-24](https://github.com/ifiokjr/scaffold/compare/0.1.0...0.1.1)

### 🔧 Fixes

- Empty files were being copied over from remote repositories due to a bug in the `untar` logic. This is now fixed and tests have been added.

## 0.1.0

> [2022-06-24](https://github.com/ifiokjr/scaffold/compare/a315dd0...0.1.0)

Initial release of the `scaffold` project. The project is currently passing tests on macos and linux only.

This project might not work on Windows, but if you would like to add support please open an issue and or pull request 😄.

### ✨ Features

- Scaffold a project with the `scaffold` command.
- Automatically cache downloaded files.
- `--force` option to overwrite the directory if it already exists.
- Experimental support `scaffold.config.ts` files in templates to customize the scaffold.
- Support for granular permissions in `scaffold.config.ts`.

```bash
Usage:   scaffold <repo> [folder]
  Version: 0.0.0

  Description:

    🏗️ Scaffold a new project from any GitHub, GitLab or BitBucket git repository.

  Options:

    -h, --help                     - Show this help.
    -V, --version                  - Show the version number for this program.
    -c, --cache           [cache]  - Set the cache directory relative to the current directory.
    --no-cache                     - Disable the cache.
    -d, --debug                    - Enable debug logging (shorthand for --log-level=debug
    -f, --force                    - Overwrite files even if they already exist.
    -l, --log-level       [level]  - Set the log level. (Values: "debug", "info", "warn", "error", "fatal")
    -s, --silent                   - Disable all logging.
    --no-template                  - Disable loading the template.config.ts file.
    -n, --name            [name]   - Set the name to be used in the template
    --description         [name]   - Set the description to be used in the template
    -y, --no-interactive           - Disable the interactive prompt.
    --use-temp-source              - Copy local files to a temporary directory before scaffolding. This might break
                                     local imports.
```
