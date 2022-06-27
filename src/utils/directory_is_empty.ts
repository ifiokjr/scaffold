/**
 * Check whether the directory is empty while ignoring whether the directory exists.
 */
export async function directoryIsEmpty(
  directory: string | URL,
): Promise<boolean> {
  const path = typeof directory === "string" ? directory : directory.pathname;

  try {
    for await (const _ of Deno.readDir(path)) {
      return false;
    }
  } catch {
    return true;
  }

  return true;
}
