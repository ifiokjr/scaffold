import { defineTemplate } from "../../../mod.ts";
import { path } from "../../../src/deps/path.ts";

export default defineTemplate({
  getVariables() {
    return {
      name: "scaffold",
      description: "A scaffold for Deno",
      version: '1.0.0',
    };
  },
  getPermissions() {
    return {
      // env: ["git", "pnpm"]
    };
  },
  getExcluded: ['ignore-me.md'],
  getRenamed: { './rename-me.md': './rename-thee.md' },
  getInstallCommand({ destination }) {
    return async () => await Deno.writeTextFile(path.join(destination, 'hello.text'), 'hello world')
  },
});
