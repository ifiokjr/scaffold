# scaffold 🏗️

> scaffold project templates with deno

![Scaffold Cli Output!](./assets/example.svg "Scaffold Cli Output")

## Why?

Sometimes you want to quickly get started with a project without worrying about setting up the boilerplate every time. `scaffold` is a solution for using remote git repositories to quickly bootstrap projects and configure them to your exact requirements.

## Installation

You must have `deno` installed on your system. Follow the instructions outlined [here](https://deno.land/x/install/).

#### Shell (macOS / Linux)

```bash
curl -fsSL https://deno.land/x/scaffold/scripts/install.sh | sh
```

#### Powershell (Windows)

```powershell
iwr https://deno.land/x/scaffold/scripts/install.ps1 -useb | iex
```

#### Direct (deno command)

```bash
deno install --unstable -Af -n scaffold https://deno.land/x/scaffold/cli.ts
```

## Usage

Scaffolding a project will download it from the remote repository in to the directory specified. The default when the `username/repo` pattern is used is to download from GitHub.

```bash
scaffold ifiokjr/templates/deno my-project
```

This downloads from `https://github.com/ifiokjr/templates` repo. And locates the `deno` subdirectory.

The supported git providers are `gitlab`, `bitbucket` and `github`. Use the full repository url to specify alternate providers.

`scaffold` creates projects from remote / local git repositories as well as local folders.

A copy of the remote or local template is made to a temporary directory.

Here the template can include a `scaffold.template.ts` file which is use to perform extra actions.

```bash
Usage:   scaffold <repo> [folder]
  Version: 0.0.0

  Description:

    Scaffold a new project from any GitHub, GitLab or BitBucket git repository.

  Options:

    -h, --help                     - Show this help.
    -V, --version                  - Show the version number for this program.
    -c, --cache           [cache]  - Set the cache directory relative to the current directory.
    --no-cache                     - Disable the cache.
    -l, --log-level       [level]  - Set the log level. (Values: "debug", "info", "warn", "error", "fatal")
    -s, --silent                   - Disable all logging.
    -d, --debug                    - Enable debug logging (shorthand for --log-level=debug)
    --no-template                  - Disable loading the template.config.ts file.
    -n, --name            [name]   - Set the name to be used in the template
    --description         [name]   - Set the description to be used in the template
    -y, --no-interactive           - Disable the interactive prompt.
```

The first time a repo is scaffolded, it will be cloned to the cache directory.

## Templates

`eta` is the template engine used in `scaffold`. Any file that is ends with the `.template` extension will be processed by `eta`.

Variables can be referenced in the template using the `<%= it.name %>` syntax. `it` is used to referenced the data passed from the `scaffold.config.ts` `getVariables` method.

File names can use an alternate platform independent syntax. For example, `[[it.name]].txt` in a project with the name `my-project` will rename the file to `my-project.txt`. It may be easier to use the `getRenamed` via the `scaffold.config.ts` file.

`eta` has a whole host of features which you can learn about [here](https://eta.js.org/docs/syntax#syntax-overview).

## API

<!--TEMPLATE: a.b-->Insert Auto Generated API Here<!--/TEMPLATE: a.b-->

## Gratitude

- This project was heavily influenced by [`degit`](https://github.com/Rich-Harris/degit) by **[@Rish-Harris](https://github.com/Rich-Harris)**.
- Special thanks to [`deno`](https://github.com/denoland/deno) for creating an elegant runtime for TypeScript development. It's been a joy to use.
- Thanks [@dsherret](https://github.com/dsherret) for creating [`dprint`](https://github.com/dprint/dprint), a blazing fast formatter that I'm falling in love with.
