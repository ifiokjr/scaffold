const [windowsStatus, unixStatus] = await Promise.all([
  Deno.permissions.query({ name: "env", variable: "USERPROFILE" }),
  Deno.permissions.query({ name: "env", variable: "HOME" }),
]);

const canCheckWindows = windowsStatus.state === "granted";
const canCheckUnix = unixStatus.state === "granted";

/** Returns the string path of the current user's home directory. Taken from
 * https://github.com/denoland/deno_std/blob/5c26306183d0a57f4ae1f4264201b7956526aa01/node/os.ts#L160-L174
 *
 * Requires the `--allow-env "USERPROFILE"` and `--allow-env "HOME"` options to
 * be passed to Deno.
 */
export function getHomeDirectory(): string | undefined {
  if (Deno.build.os === "windows" && canCheckWindows) {
    return Deno.env.get("USERPROFILE");
  }

  if (canCheckUnix) {
    return Deno.env.get("HOME");
  }

  return;
}
