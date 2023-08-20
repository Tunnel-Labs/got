/**
	Inspired by <https://github.com/NaturalCycles/nodejs-lib/blob/master/src/got/getGot.ts>
*/
import util from "node:util";

import type { BeforeErrorHook } from "got";

import type { GetGotOptions } from "~/types/options.js";

export interface GotRequestContext extends Record<string, unknown> {
  /**
   * Millisecond-timestamp of when the request was started. To be able to count "time spent".
   */
  started: number;

  err?: Error;

  retryCount?: number;
}

function getShortUrl(opt: GetGotOptions, url: URL, prefixUrl?: string): string {
  if (url.password) {
    url = new URL(url.toString()); // prevent original url mutation
    url.password = "[redacted]";
  }

  let shortUrl = url.toString();

  if (opt.logWithSearchParams === false) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Guaranteed to exist
    shortUrl = shortUrl.split("?")[0]!;
  }

  if (
    opt.logWithPrefixUrl === false &&
    prefixUrl &&
    shortUrl.startsWith(prefixUrl)
  ) {
    shortUrl = shortUrl.slice(prefixUrl.length);
  }

  return shortUrl;
}

/**
	Without this hook (default behavior):

	HTTPError: Response code 422 (Unprocessable Entity)
	at EventEmitter.<anonymous> (.../node_modules/got/dist/source/as-promise.js:118:31)
	at processTicksAndRejections (internal/process/task_queues.js:97:5) {
	name: 'HTTPError'


	With this hook:

	HTTPError 422 GET http://a.com/err?q=1 in 8 ms
	{
		message: 'Reference already exists',
		documentation_url: 'https://developer.github.com/v3/git/refs/#create-a-reference'
	}

	Features:
	1. Includes original method and URL (including e.g searchParams) in the error message.
	2. Includes response.body in the error message (limited length).
	3. Auto-detects and parses JSON response body (limited length).
	4. Includes time spent (gotBeforeRequestHook must also be enabled).
	UPD: excluded now to allow automatic Sentry error grouping
*/
export function gotErrorHook(opt: GetGotOptions): BeforeErrorHook {
  const maxResponseLength = 10_000;

  return (err) => {
    const statusCode = err.response?.statusCode ?? 0;
    const { method, url, prefixUrl } = err.options;
    const shortUrl =
      url === undefined
        ? ""
        : getShortUrl(opt, new URL(url), prefixUrl.toString());

    const { started, retryCount } = (err.request?.options.context ??
      {}) as GotRequestContext;

    const body = err.response?.body
      ? util.inspect(err.response.body, {
          colors: false,
          maxStringLength: maxResponseLength,
        })
      : err.message;

    // We don't include Response/Body/Message in the log, because it's included in the Error thrown from here
    if (process.env.NODE_ENV !== "production") {
      console.debug(
        [
          " <<",
          statusCode,
          method,
          shortUrl,
          retryCount && `(retry ${retryCount})`,
          "error",
        ]
          .filter(Boolean)
          .join(" ")
      );
    }

    // timings are not part of err.message to allow automatic error grouping in Sentry
    // Colors are not used, because there's high chance that this Error will be propagated all the way to the Frontend
    err.message = [
      [statusCode, method, shortUrl].filter(Boolean).join(" "),
      body,
    ]
      .filter(Boolean)
      .join("\n");

    const stack = (err.options.context as GotRequestContext | undefined)?.err
      ?.stack;
    if (stack) {
      const originalStack = err.stack.split("\n");
      let originalStackIndex = originalStack.findIndex((line) =>
        line.includes(" at ")
      );
      if (originalStackIndex === -1)
        originalStackIndex = originalStack.length - 1;

      // Skipping first line as it has RequestError: ...
      // Skipping second line as it's known to be from e.g at got_1.default.extend.handlers
      const syntheticStack = stack.split("\n").slice(2);
      let firstNonNodeModulesIndex = syntheticStack.findIndex(
        (line) => !line.includes("node_modules")
      );
      if (firstNonNodeModulesIndex === -1) firstNonNodeModulesIndex = 0;

      err.stack = [
        // First lines of original error
        ...originalStack.slice(0, originalStackIndex),
        // Other lines from "Synthetic error"
        ...syntheticStack.slice(firstNonNodeModulesIndex),
      ].join("\n");
      // err.stack += '\n    --' + stack.replace('Error: RequestError', '')
    }

    // Marking certain properties as non-enumerable to prevent verbose logs
    Object.defineProperty(err, "timings", { enumerable: false });
    Object.defineProperty(err, "options", { enumerable: false });

    return err;
  };
}
