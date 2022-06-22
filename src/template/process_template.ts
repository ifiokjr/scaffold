import {
  Checkbox,
  Confirm,
  Input,
  List,
  Number,
  prompt,
  Secret,
  Select,
  Toggle,
} from "../deps/cli.ts";
import { copy, ensureDir } from "../deps/fs.ts";
import { isFunction, objectKeys, render } from "../deps/npm.ts";
import { path } from "../deps/path.ts";
import { assert } from "../deps/std.ts";
import { glob } from "../glob.ts";
import {
  AnyVariables,
  BaseTemplateProps,
  Callable,
  ScaffoldPermissions,
  TemplateProps,
} from "./define_template.ts";
import { loadImport } from "./load_import.ts";

/**
 * A class that wraps the template.
 */

export class ProcessTemplate {
  /**
   * So that `load` is only called once this tracks when it has been called.
   */
  #loaded = false;
  #base: BaseTemplateProps;
  #template?: TemplateProps;
  #variables?: AnyVariables;

  get template() {
    assert(
      this.#loaded,
      "must call `load` before accessing the template property.",
    );

    return this.#template;
  }

  get variables(): AnyVariables {
    return this.#variables ?? this.#base.initialVariables;
  }

  constructor(base: BaseTemplateProps) {
    this.#base = { ...base };
  }

  /**
   * Load the dynamically imported template.
   */
  async load() {
    if (this.#loaded) {
      return;
    }

    this.#loaded = true;
    const result = await loadImport<TemplateProps>(
      this.#base.source,
      this.#base.name,
    );
    const template = result?.config;

    if (!template) {
      return;
    }

    this.#template = template;
  }

  /**
   * Load the variables. This should be called first.
   */
  async getVariables(): Promise<AnyVariables | undefined> {
    const getVariables = this.template?.getVariables;

    if (!getVariables) {
      this.#variables = this.#base.initialVariables;
      return;
    }

    this.#variables = await extractCallable(getVariables, {
      ...this.#base,
      prompt,
      type: { Checkbox, Confirm, Input, List, Number, Secret, Select, Toggle },
    });

    return this.#variables;
  }

  /**
   * Get the permissions.
   */
  async getPermissions(): Promise<ScaffoldPermissions | undefined> {
    const getPermissions = this.template?.getPermissions;

    if (!getPermissions) {
      return;
    }

    const permissions = await extractCallable(getPermissions, {
      ...this.#base,
      variables: this.variables,
    });

    if (!permissions) {
      return;
    }

    const names = ["write", "read"];
    const paths = [this.#base.destination, this.#base.source];
    const granted: ScaffoldPermissions = {
      env: [],
      ffi: [],
      read: [],
      run: [],
      write: [],
    };

    for (const name of objectKeys(permissions)) {
      for (const value of permissions[name] ?? []) {
        if (names.includes(name) && paths.includes(value)) {
          continue;
        }

        granted[name].push(value);

        if (
          // the permission is already granted no need to request again.
          this.#base.permissions.env.includes(value) ||
          // request the permission and check to see it it is granted.
          (await requestPermission(name, value)) !== "granted"
        ) {
          continue;
        }

        this.#base.permissions[name].push(value);
      }
    }

    return granted;
  }

  /**
   * Process the template copying from the source to the destination.
   */
  async processTemplate(): Promise<void> {
    const { source, destination } = this.#base;
    const { getIncluded, getExcluded } = this.template ?? {};
    const exclude = getExcluded
      ? await extractCallable(getExcluded, {
        ...this.#base,
        variables: this.variables,
      })
      : undefined;
    const include = getIncluded
      ? await extractCallable(getIncluded, {
        ...this.#base,
        variables: this.variables,
      })
      : undefined;

    const sourceIterator = glob({ cwd: source, exclude, include, dot: true });
    const template = createTemplateFactory(this.variables);

    await ensureDir(destination);

    for await (const file of sourceIterator) {
      const { absolute, relative, name } = file;

      // the target file / directory
      const target = path.join(
        destination,
        template(relative.replace(/\.template$/, "")),
      );

      if (file.isDirectory) {
        await ensureDir(target);
        continue;
      }

      // process the `.template` files.
      if (name.endsWith(".template")) {
        const content = template(await Deno.readTextFile(absolute));

        // move the templated data to the new file.
        await Deno.writeTextFile(target, content);
      } else {
        await copy(absolute, target);
      }
    }
  }

  async install(): Promise<void> {
    const getInstallCommand = this.template?.getInstallCommand;

    if (!getInstallCommand) {
      return;
    }

    const command = await extractCallable(getInstallCommand, {
      ...this.#base,
      variables: this.variables,
    });

    await command?.();
  }
}
function createTemplateFactory(variables: AnyVariables) {
  return (content: string): string => {
    return render(content, variables) as string;
  };
}

async function requestPermission(
  name: keyof ScaffoldPermissions,
  value: string,
): Promise<Deno.PermissionState> {
  let status: Deno.PermissionStatus;

  if (name === "env") {
    status = await Deno.permissions.request({ name, variable: value });
  } else if (name === "ffi") {
    status = await Deno.permissions.request({ name, path: value });
  } else if (name === "read") {
    status = await Deno.permissions.request({ name, path: value });
  } else if (name === "run") {
    status = await Deno.permissions.request({ name, command: value });
  } else {
    status = await Deno.permissions.request({ name, path: value });
  }

  return status.state;
}
function extractCallable<Type, Props>(
  callable: Callable<Type, Props> | undefined,
  props: Props,
) {
  return isFunction(callable) ? callable(props) : callable;
}
