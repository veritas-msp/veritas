/**
 * Production CRA build with lower peak memory than a stock react-scripts build.
 * Heap size must be set on the `node` CLI / NODE_OPTIONS before this file loads
 * (see Dockerfile). Setting max-old-space-size here has no effect on the current process.
 */
"use strict";

process.env.BABEL_ENV = "production";
process.env.NODE_ENV = "production";
process.env.GENERATE_SOURCEMAP = "false";
process.env.DISABLE_ESLINT_PLUGIN = "true";
process.env.INLINE_RUNTIME_CHUNK = "false";
process.env.IMAGE_INLINE_SIZE_LIMIT = "0";
process.env.CI = "false";
process.env.UV_THREADPOOL_SIZE = "1";

require("react-scripts/scripts/build");
