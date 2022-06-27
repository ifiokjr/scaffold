## defineTemplate

Use this function to define a template with methods for generating the scaffolded project.

### Examples

The following example shows what is possible using the `defineTemplate` function.

It uses `getPermissions` to request access from the user to `git` for running commands.

Any permissions that are granted will be saved for the next time you use this scaffold. Please note that this is version dependent and if the hash of the repository changes the permissions will need to be re-applied.

```ts
import { defineTemplate } from "https://deno.land/x/scaffold@<%=it.version=>/mod.ts";

export default defineTemplate({
  getPermissions: { run: ["git", "deno"] },
  async getVariables({ prompt, type, initialVariables }) {
    const answers = await prompt([
      {
        message: "Name",
        type: type.Input,
        name: "name",
        default: initialVariables.name as string,
      },
      {
        message: "Description",
        type: type.Input,
        name: "description",
        default: initialVariables.name as string,
      },
    ]);

    return {
      ...initialVariables,
      year: new Date().getUTCFullYear(),
      ...answers,
    };
  },
  getInstallCommand({ destination }) {
    return async () => {
      await Deno.run({
        cmd: ["git", "add", "."],
        cwd: destination,
      }).status();

      await Deno.run({
        cmd: ["git", "commit", "-m", '"feat: initial commit 🎉'],
        cwd: destination,
      }).status();
    };
  },
});
```
