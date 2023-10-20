import https from "node:https";

import { getMkcertCerts } from "@tunnel/mkcert";
import { got as _got } from "got";
import { getMonorepoDirpath } from "get-monorepo-root";
import which from "which";

import { gotErrorHook } from "./utils/error.js";

export const got = _got.extend({
  handlers: [
    async (options, next) => {
      if (
        options.url !== undefined &&
        new URL(options.url).hostname.endsWith(".test")
      ) {
        const monorepoDirpath = getMonorepoDirpath(import.meta.url);
        if (monorepoDirpath === undefined) {
          throw new Error("Could not find monorepo dirpath");
        }

        const { ca, cert, key } = await getMkcertCerts({
          mkcertBin: await which("mkcert"),
          monorepoDirpath,
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
