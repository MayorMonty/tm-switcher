import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import { typescriptPaths } from "rollup-plugin-typescript-paths";
import injectProcessEnv from "rollup-plugin-inject-process-env";

import "dotenv/config.js";

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
  input: "./switcher/main.ts",
  plugins: [
    typescriptPaths(),
    typescript({
      outputToFilesystem: false,
    }),
    json({
      compact: true,
    }),
    resolve({
      preferBuiltins: true,
    }),
    commonjs({
      ignoreDynamicRequires: true,
    }),
    injectProcessEnv({
      TM_SWITCHER_VEX_TM_CLIENT_ID: process.env.TM_SWITCHER_VEX_TM_CLIENT_ID,
      TM_SWITCHER_VEX_TM_CLIENT_SECRET:
        process.env.TM_SWITCHER_VEX_TM_CLIENT_SECRET,
      TM_SWITCHER_VEX_TM_EXPIRATION_DATE:
        process.env.TM_SWITCHER_VEX_TM_EXPIRATION_DATE,
      TM_SWITCHER_LOG_SERVER: process.env.TM_SWITCHER_LOG_SERVER,
      TM_SWITCHER_LOG_TOKEN: process.env.TM_SWITCHER_LOG_TOKEN,
    }),
  ],
  external: ["@julusian/freetype2", "atem-connection"],
  output: {
    file: "./out/switcher/main.cjs",
    format: "commonjs",
  },
};
export default config;
