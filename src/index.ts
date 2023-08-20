import https from "node:https";

import { getMkcertCerts } from "@tunnel/mkcert";
import { got as _got } from "got";

import { gotErrorHook } from "./utils/error.js";

export const got = _got.extend({
  handlers: [
    async (options, next) => {
      if (
        options.url !== undefined &&
        new URL(options.url).hostname.endsWith(".test")
      ) {
        const cliHelpersString = "@t/cli-helpers";
        const { cli } = await import(cliHelpersString);
        const { ca, cert, key } = await getMkcertCerts({
          mkcertBin: await cli.mkcert.getExecutablePath(),
        });
        options.agent.https = new https.Agent({
          ca,
          cert,
          key,
        });
      }

      return next(options);
    },
  ],
  hooks: {
    beforeError: [gotErrorHook({})],
  },
});

export type * from "got";
