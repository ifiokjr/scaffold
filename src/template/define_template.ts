import type {
  Checkbox,
  Confirm,
  Input,
  List,
  Number,
  prompt,
  Secret,
  Select,
  Toggle,
} from "../deps/cli.ts";
import { Match } from "../utils/create_matcher.ts";
import { ExportedConfig } from "./types.ts";

export function defineTemplate(
  props: ExportedConfig<TemplateProps>,
): ExportedConfig<TemplateProps> {
  return props;
}

type MaybePromise<Type> = Type | Promise<Awaited<Type>>;
export type AnyVariables = Record<string, any>;
export type Callable<Type, Props = void> =
  | MaybePromise<Type>
  | ((props: Props) => MaybePromise<Type>);
interface MatchProps<Variables extends AnyVariables = AnyVariables>
  extends BaseTemplateProps {
  variables: Variables;
}

interface PromptProps {
  /**
   * Only available if `interactive` is `true`.
   */
  prompt: typeof prompt;

  /**
   * Only available if `interactive` is `true`.
   */
  type: {
    Checkbox: typeof Checkbox;
    Confirm: typeof Confirm;
    Input: typeof Input;
    Number: typeof Number;
    Secret: typeof Secret;
    Toggle: typeof Toggle;
    List: typeof List;
    Select: typeof Select;
  };
}

/**
 * Permissions granted will be persisted across runs of the templates.
 */
export interface ScaffoldPermissions {
  env: string[];
  ffi: string[];
  read: string[];
  run: string[];
  write: string[];
}

export interface TemplateProps<
  Variables extends AnyVariables = AnyVariables,
> {
  /**
   * Use the prompt to ask the user for input to determine the variables.
   *
   * This is not always called, if the user decided to skip the prompt then it
   * will be skipped.
   *
   * Further docs can be found here: https://cliffy.io/docs@v0.24.2/prompt
   *
   * ```ts
   * import { defineTemplate } from 'https://deno.land/x/scaffold/mod.ts';
   *
   * export defineTemplate({
   *   gatherVariables: async (props) => {
   *     const { prompt,  } = props;
   *   }
   * });
   * ```
   */
  getVariables?: Callable<Record<string, any>, BaseTemplateProps & PromptProps>;

  /**
   * Gather the permissions for the worker.
   *
   * Permissions that are approved will be cached so that the template can be
   * without requesting new permissions every time.
   */
  getPermissions?: Callable<ScaffoldPermissions, MatchProps<Variables>>;

  /**
   * These file will be included.
   *
   * Starting a glob with the `!` will negate the match. For clarity it is
   * advised to use the `exclude` option instead.
   */
  getIncluded?: Callable<Match | Match[], MatchProps<Variables>>;

  /**
   * Files that match will be excluded.
   */
  getExcluded?: Callable<Match | Match[], MatchProps<Variables>>;

  /**
   * Get an installation command which is run after the template is copied over.
   *
   * This can be used to run an npm install and initialize git.
   */
  getInstallCommand?: Callable<() => Promise<void>, MatchProps<Variables>>;
}

export interface BaseTemplateProps {
  /**
   * The name of the configuration file.
   *
   * @default 'scaffold'
   */
  name: string;

  /**
   * The absolute path to the source directory of the template.
   */
  source: string;

  /**
   * The absolute path to the destination directory.
   */
  destination: string;

  /**
   * All the cli arguments that were passed when created via the cli.
   */
  initialVariables: Record<string, any>;

  /**
   * The current permissions of the worker.
   */
  permissions: ScaffoldPermissions;

  /**
   * By default interactive is true. The prompt should only be used when
   * interactive is true.
   *
   * If false, then `getVariables` will not be called.
   *
   * @default true
   */
  interactive: boolean;
}
