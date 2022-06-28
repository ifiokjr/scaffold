import { uint8ArrayToString } from "../utils.ts";

/**
 * Export the user details, where available.
 *
 * This requires `--allow-env="git"` and `--allow-env="whoami" to run.
 */
export async function getUserDetails() {
  const details = Object.create(null);
  const promises: Array<Promise<void>> = [];

  for (const [key, cmd] of Object.entries(commands)) {
    const promise = Deno.run({ cmd, stdout: "piped" }).output().then(
      (output) => {
        details[key] = uint8ArrayToString(output).trim() || undefined;
      },
    );

    promises.push(promise);
  }

  await Promise.all(promises);

  return details;
}

const commands: Record<keyof UserDetails, string[]> = {
  email: ["git", "config", "user.email"],
  username: ["git", "config", "user.name"],
  user: ["whoami"],
};

export interface UserDetails {
  /**
   * The email address of the user if available via `git`.
   */
  email: string | undefined;

  /**
   * The name via `git config user.name`.
   */
  username: string | undefined;

  /**
   * The name of the logged in user, if available use `whoami`
   */
  user: string | undefined;
}
