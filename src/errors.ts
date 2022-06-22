import { isError } from "./deps/npm.ts";

export class ScaffoldError extends AggregateError {
  static is<Error extends ScaffoldError>(value: unknown): value is Error {
    return value instanceof this;
  }
  constructor(message: string, errors: unknown[] = []) {
    super(errors, message);
  }
}

export class LoadRepositoryError extends ScaffoldError {
  constructor(message: string, errors?: unknown[]) {
    super(`LOAD_REPOSITORY_ERROR: ${message}`, errors);
  }
}

export class CacheError extends ScaffoldError {
  constructor(message: string, errors?: unknown[]) {
    super(`CACHE_ERROR: ${message}`, errors);
  }
}

export class GlobError extends ScaffoldError {
  static wrap(error: unknown, root: string): GlobError {
    if (GlobError.is<GlobError>(error)) {
      return error;
    }

    const [message, stack, cause] = isError(error)
      ? [`${error.message} for path "${root}"`, error.stack, error.cause]
      : [`[non-error thrown] for path "${root}"`];
    const globError = new GlobError(root, message, [error]);

    globError.stack = stack;
    globError.cause = cause;

    return globError;
  }

  /**
   * The root which caused this error to be thrown.
   */
  root: string;

  constructor(root: string, message: string, errors?: unknown[]) {
    super(`GLOB_ERROR: ${message}`, errors);
    this.root = root;
  }
}
