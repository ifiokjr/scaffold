let supported = true;

const permissions = await Promise.all([
  Deno.permissions.query({ name: "env", variable: "TERM" }),
  Deno.permissions.query({ name: "env", variable: "CI" }),
  Deno.permissions.query({ name: "env", variable: "FORCE_COLOR" }),
]);

if (permissions.every((permission) => permission.state === "granted")) {
  supported =
    // terminal is not dumb
    (Deno.isatty(1) && Deno.env.get("TERM") !== "dumb") ||
    // default support in CI systems which haven't disabled colors
    !!Deno.env.get("CI") ||
    // colors are forced by the environment
    !!Deno.env.get("FORCE_COLOR");
}

/**
 * Check for color support.
 *
 * Requires the `--allow-env` flag to be passed to Deno.
 */
export function isColorSupported() {
  // Exit early if the user has disabled colors.
  if (Deno.noColor || Deno.args.includes("--no-color")) {
    return false;
  }

  return (
    // forced by args used when calling this script
    Deno.args.includes("--color") ||
    // support colors on windows by default
    Deno.build.os === "windows" || supported
  );
}
