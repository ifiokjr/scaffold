/**
 * Taken from `is-unicode-supported` but with support for deno.
 *
 * Requires the `--allow-env` flag to be passed to Deno.
 */
export function isUnicodeSupported(): boolean {
  if (Deno.build.os !== "windows") {
    return Deno.env.get("TERM") !== "linux";
  }

  return (
    !!Deno.env.get("CI") ||
    !!Deno.env.get("WT_SESSION") ||
    Deno.env.get("ConEmuTask") === "{cmd::Cmder}" ||
    Deno.env.get("TERM_PROGRAM") === "vscode" ||
    Deno.env.get("TERM") === "xterm-256color" ||
    Deno.env.get("TERM") === "alacritty" ||
    Deno.env.get("TERMINAL_EMULATOR") === "JetBrains-JediTerm"
  );
}
