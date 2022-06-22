/**
 * Taken from
 * https://github.com/denoland/node_deno_shims/blob/578ff710f8441e043b7625411c4b4fde3318afb1/packages/shim-deno/src/deno/internal/iterutil.ts#L1-L5
 */
export function* map<Initial, Transformed>(
  iterable: Iterable<Initial>,
  f: (t: Initial) => Transformed,
): Generator<Transformed, void, unknown> {
  for (const item of iterable) {
    yield f(item);
  }
}

/**
 * Taken from
 * https://github.com/denoland/node_deno_shims/blob/578ff710f8441e043b7625411c4b4fde3318afb1/packages/shim-deno/src/deno/internal/iterutil.ts#L7-L14
 */
export async function* mapAsync<Initial, Transformed>(
  iterable: AsyncIterable<Initial>,
  f: (t: Initial) => Transformed,
): AsyncGenerator<Transformed, void, unknown> {
  for await (const item of iterable) {
    yield f(item);
  }
}

/**
 * Taken from
 * https://github.com/denoland/node_deno_shims/blob/578ff710f8441e043b7625411c4b4fde3318afb1/packages/shim-deno/src/deno/internal/iterutil.ts#L16-L39
 */
export async function* merge<Type>(iterables: AsyncIterable<Type>[]) {
  const racers = new Map<AsyncIterator<Type>, Promise<IteratorResult<Type>>>(
    map(
      map(iterables, (iterable) => iterable[Symbol.asyncIterator]()),
      (iterable) => [iterable, iterable.next()],
    ),
  );

  while (racers.size > 0) {
    const winner = await Promise.race(
      map(
        racers.entries(),
        ([iterable, promise]) =>
          promise.then((result) => ({ result, iterable })),
      ),
    );

    if (winner.result.done) {
      racers.delete(winner.iterable);
    } else {
      yield await winner.result.value;
      racers.set(winner.iterable, winner.iterable.next());
    }
  }
}
