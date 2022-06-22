import { colors } from "./deps/cli.ts";
import { isArray, isObject, isPrimitive } from "./deps/npm.ts";
import {
  BaseHandler,
  HandlerOptions,
  LevelName,
  Logger,
  LogLevels,
  LogRecord,
} from "./deps/std.ts";

export class ConsoleHandler extends BaseHandler {
  constructor(
    level: LevelName,
    options: HandlerOptions = { formatter: "{levelName} {msg} {args}" },
  ) {
    super(level, options);
  }
  override format(logRecord: LogRecord): string {
    if (this.formatter instanceof Function) {
      return this.formatter(logRecord);
    }

    let symbol = "";
    let badge = "";

    switch (logRecord.level) {
      case LogLevels.DEBUG:
        symbol = `${symbols["DEBUG"]} `;
        badge = colors.black.bgRgb24(" debug ", 0xdddddd);
        break;
      case LogLevels.INFO:
        symbol = `${symbols["INFO"]} `;
        badge = colors.bgBlue.black(" info ");
        break;
      case LogLevels.WARNING:
        symbol = `${symbols["WARNING"]} `;
        badge = colors.bgBrightYellow.black(" warn ");
        break;
      case LogLevels.ERROR:
        symbol = `${symbols["ERROR"]} `;
        badge = colors.bgRed.white(" error ");
        break;
      case LogLevels.CRITICAL:
        symbol = `${symbols["ERROR"]} `;
        badge = colors.bold.bgRed.blue(" fatal ");
        break;
      default:
        break;
    }

    return this.formatter.replace(/{([^\s}]+)}/g, (match, p1): string => {
      if (p1 === "symbol") {
        return symbol;
      }

      if (p1 === "badge") {
        return badge;
      }

      const value = logRecord[p1 as keyof LogRecord];
      // do not interpolate missing values
      if (value == null) {
        return match;
      }

      if (value instanceof Date || isObject(value)) {
        return Deno.inspect(value, { colors: !Deno.noColor });
      }

      if (!isArray(value) || p1 !== "args") {
        return logRecord.level === LogLevels.CRITICAL
          ? colors.red(String(value))
          : String(value);
      }

      const args: string[] = [];

      for (const arg of value) {
        if (arg) {
          args.push(
            isPrimitive(arg)
              ? String(arg)
              : Deno.inspect(arg, { colors: !Deno.noColor }),
          );
        }
      }

      return args.join(" ");
    });
  }

  override log(msg: string): void {
    console.log(msg);
  }
}

// it would be better to use `isUnicodeSupported()` and `isColorSupported()` but
// they require extra permissions.
const symbols: Record<LevelName, string> = Deno.build.os === "windows"
  ? {
    NOTSET: "",
    CRITICAL: colors.bold.red("×"),
    ERROR: colors.red("×"),
    WARNING: colors.yellow("‼"),
    INFO: colors.blue("i"),
    DEBUG: colors.gray("›"),
  }
  : {
    NOTSET: "",
    CRITICAL: colors.bold.red("ⓧ"),
    ERROR: colors.red("✖"),
    WARNING: colors.yellow("⚠"),
    INFO: colors.blue("ℹ"),
    // success: colors.green('✔'),
    DEBUG: colors.gray("›"),
  };

class BetterLogger extends Logger {
  override asString(data: unknown): string {
    if (typeof data === "string") {
      return data;
    } else if (
      data === null ||
      typeof data === "number" ||
      typeof data === "bigint" ||
      typeof data === "boolean" ||
      typeof data === "undefined" ||
      typeof data === "symbol"
    ) {
      return String(data);
    } else if (data instanceof Error) {
      return data.stack!;
    } else if (typeof data === "object") {
      return Deno.inspect(data, { colors: !Deno.noColor });
    }

    return "undefined";
  }
}

interface CreateLoggerProps {
  name: string;
  levelName?: LevelName;
  formatter?: string;
}

/**
 * Create a logger with the given name and level.
 */
export function createLogger(
  props: CreateLoggerProps,
) {
  const {
    name,
    levelName = "CRITICAL",
    formatter = `{symbol} {badge} ${colors.gray("scaffold")} {msg} {args}`,
  } = props;

  return new BetterLogger(name, levelName, {
    handlers: [new ConsoleHandler(levelName, { formatter })],
  });
}
