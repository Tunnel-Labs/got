import type { Options } from 'got';

export interface GetGotOptions extends Partial<Options> {
	/**
	 * Set to `true` to enable all possible debug logging.
	 * Not safe in prod (as it logs Responses), but great to use during development.
	 */
	debug?: boolean;

	/**
	 * @default false
	 */
	logStart?: boolean;

	/**
	 * Log when request is finished.
	 *
	 * @default false
	 */
	logFinished?: boolean;

	/**
	 * Log request object.
	 *
	 * @default false
	 */
	logRequest?: boolean;

	/**
	 * Log actual response object.
	 *
	 * @default false
	 */
	logResponse?: boolean;

	/**
	 * @default true
	 * Set to false to exclude `prefixUrl` from logs (both success and error)
	 */
	logWithPrefixUrl?: boolean;

	/**
	 * @default true
	 * Set to false to strip searchParams from url when logging (both success and error)
	 */
	logWithSearchParams?: boolean;

	/**
	 * Max length of response object before it's truncated.
	 *
	 * @default 10_000
	 */
	maxResponseLength?: number;
}
