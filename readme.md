# 🏗️ scaffold

<br />

> scaffold project templates with deno

![Scaffold Cli Output!](./assets/example.svg "Scaffold Cli Output")

## Why?

Ideas come to us all the time. Often it's the small ideas that lead to impactful projects, but sadly it's the small ideas that are dismissed too early. One of the greatest tools in a developers arsenal can hold is the ability to quickly test an idea, iterate on the concept, and ship it to the world. `scaffold` is designed to make you more effective at testing your small ideas. Start your next project using any public repository and quickly test your initial hypothesis in a short amount of time.

## Advantages

Scaffold is fast, lightweight and allows for full customization of the bootstrapped project via the `scaffold.config.ts`. Add this configuration file to the root of the project to prompt users for information about the project, e.g. do they prefer javascript or typescript, do they want to use a different build tool, etc. Their responses are stored and can be used to customise the project. Answers are also provided as template variables to the files in the project using the [`eta`](https://github.com/eta-dev/eta) template engine.

Another key advantage of `scaffold` as a project bootstrapping tool for your next project, is that it takes advantage of the `deno` worker runtime sandbox. This means that every remote template you install, needs to request express permissions the first time it's run. Once the permissions are granted then it should be able to run in the future without issues. This is a great feature of deno and part of the reason why `scaffold` was created.

## Installation

You should have `deno` installed on your system. Follow the instructions outlined [here](https://deno.land/x/install/).

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
deno install --unstable -Af https://deno.land/x/scaffold/scaffold.ts
```

If you prefer to avoid the installation step then you can directly run the command when you want to use it.

```bash
deno run --unstable -A https://deno.land/x/scaffold/scaffold.ts <repository> <projectName>
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

Here the template can include a `scaffold.config.ts` file which can register async handlers to extract responses from the user and provide a customized project.

```bash
Usage:   scaffold <repo> [folder]
Version: 0.1.1

Description:

  🏗️ Scaffold a new project from any GitHub, GitLab or BitBucket git repository.

Options:

  -h, --help                           - Show this help.
  -V, --version                        - Show the version number for this program.
  --cache-dir             [cacheDir]   - Set a custom cache directory.
  --cache-only            [cacheOnly]  - Only use the cache (no network requests).
  --no-cache                           - Disable the cache.
  --reset-cache                        - Reset the cache before the download.
  -d, --debug                          - Enable debug logging.
  -f, --force                          - Overwrite files even if they already exist.
  -s, --silent                         - Disable all logging.
  --no-template                        - Disable loading the scaffold.config.ts file.
  -n, --name              [name]       - Set the name to be used in the template
  --description           [name]       - Set the description to be used in the template
  -y, --no-interactive                 - Disable the interactive prompt. Might break permission requests.
  --use-temporary-source               - Copy local files to a temporary directory.

Commands:

  alias        <alias> <repo>  - Create an alias for a template repository
  upgrade                      - Upgrade scaffold executable to latest or given version.
  help         [command]       - Show this help or the help of a sub-command.
  completions                  - Generate shell completions.

Examples:

  GitHub: scaffold ifiokjr/templates/deno my-project
          This will use the deno directory within the repository https://github.com/ifiokjr/templates
  GitLab: scaffold gitlab:ifiokjr/scaffold-test my-project
          This will pull directly from https://gitlab.com/ifiokjr/scaffold-test
  Local:  scaffold ./path/to/local/directory my-project
          The path must start with './' to be recognized as a local directory.
```

The first time a repo is scaffolded, it will be cloned to the cache directory.

## Templates

`eta` is the template engine used in `scaffold`. Any file that is ends with the `.template` extension will be processed by `eta`.

Variables can be referenced in the template using the `<%= it.name %>` syntax. `it` is used to referenced the data passed from the `scaffold.config.ts` `getVariables` method.

File names can use an alternate platform independent syntax. For example, `[[it.name]].txt` in a project with the name `my-project` will rename the file to `my-project.txt`. It may be easier to use the `getRenamed` via the `scaffold.config.ts` file.

`eta` has a whole host of features which you can learn about [here](https://eta.js.org/docs/syntax#syntax-overview).

## API

<!--TEMPLATE: a.b-->Coming soon!<!--/TEMPLATE: a.b-->

## Gratitude

- This project was heavily influenced by [`degit`](https://github.com/Rich-Harris/degit) by **[@Rish-Harris](https://github.com/Rich-Harris)**.
- Special thanks to [`deno`](https://github.com/denoland/deno) for creating an elegant runtime for TypeScript development. It's been a joy to use.
- Thanks [@dsherret](https://github.com/dsherret) for creating [`dprint`](https://github.com/dprint/dprint), a blazing fast formatter that I'm falling in love with.
- Thanks [@c4spar](https://github.com/c4spar) for creating [`cliffy`](https://github.com/c4spar/deno-cliffy) which I've used for the command line interface. This project wouldn't be possible without you.
- Thanks [`eta`](https://github.com/eta-dev/eta) for being a easy to use template engine!
