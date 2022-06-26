import "./cli.ts";
import { ScaffoldError } from "./src/errors.ts";

if (!import.meta.main) {
  throw new ScaffoldError("The cli should not be imported as a module");
}
