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
