# scaffold

> scaffold any project template with deno

## Why?

Sometimes you want to quickly get started with a project. This is a tool to help. `scaffold` allows you to use any github repo as a starting point.

## Installation

#### Shell (macOS / Linux)

```bash
curl -fsSL https://deno.land/x/scaffold/scripts/install.sh | sh
```

#### Powershell (Windows)

```powershell
iwr https://deno.land/x/scaffold/scripts/install.ps1 -useb | iex
```

## Usage

```bash
scaffold ifiokjr/sample-template my-project
```

This creates a folder from the `https://github.com/ifiokjr/sample-template` repo.

`scaffold` creates projects from remote / local git repositories as well as local folders.

A copy of the remote or local template is made to a temporary directory.

Here the template can include a `scaffold.template.ts` file which is use to perform extra actions.

<!--TEMPLATE: a.b-->This is a template<!--/TEMPLATE: a.b-->

## Templates

`eta` is the template engine used in `scaffold`. Any file that is ends with the `.template` extension will be processed by `eta`.

Variables can be referenced in the template using the `<%= it.name %>` syntax. `it` is the variable that stores all the data captures in the `scaffold.config.ts` file.

File names can also use the template syntax. For example, `<%= it.name %>.txt` in a project with the name `my-project` will rename the file to `my-project.txt`.

`eta` has a whole host of features which you can learn about [here](https://eta.js.org/docs/syntax#syntax-overview).
