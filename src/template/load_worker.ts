import { Remote, wrap } from "../deps/comlink.ts";
import { merge } from "../deps/npm.ts";
import { ScaffoldPermissions } from "../template/define_template.ts";
import { ProcessTemplate } from "../template/process_template.ts";

interface LoadWorkerProps {
  name: string;
  source: string;
  destination: string;
  permissions?: Partial<ScaffoldPermissions>;
  variables: Record<string, any>;
  interactive: boolean;
}

/**
 * Load a configuration file with the given name from within a worker.
 *
 * This provides the ability to restrict permissions before publication.
 *
 * The configuration file is a typescript or javascript file.
 *
 * The following extensions are supported: `.ts` | `.mts` | `.js` |
 * `.mjs`
 */
export async function loadWorker(
  props: LoadWorkerProps,
): Promise<Remote<ProcessTemplate>> {
  const { destination, interactive, source, variables, name } = props;
  const url = new URL("./worker.ts", import.meta.url);
  url.searchParams.set("_now", Date.now().toString());
  const permissions: ScaffoldPermissions = merge({
    env: [],
    ffi: [],
    read: [source, destination],
    write: [destination],
    run: [],
  }, props.permissions ?? {});

  const worker = new Worker(url.href, {
    type: "module",
    deno: { permissions: { hrtime: false, net: "inherit", ...permissions } },
  });

  const Processor = wrap<typeof ProcessTemplate>(worker);
  const config = {
    destination,
    permissions,
    source,
    initialVariables: variables,
    interactive,
    name,
  };

  const processor = await new Processor(config);
  await processor.load();

  return processor;
}