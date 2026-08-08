/**
 * Production CRA build with lower peak memory than a stock react-scripts build.
 * No Node heap cap — V8 may use all RAM and swap available to the container.
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
