/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />

import { expose } from "../deps/comlink.ts";
import { ProcessTemplate } from "../template/process_template.ts";

// Expose the class which can be instantiated from outside the worker, but with
// the same security restrictions.
expose(ProcessTemplate);
