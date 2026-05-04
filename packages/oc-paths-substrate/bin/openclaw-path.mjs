#!/usr/bin/env node
// Thin shim — defers to the compiled CLI in dist/. Keeps the bin
// script tiny so install-time work is just shipping a forwarder.
import { runCli } from '../dist/cli/index.js';

runCli(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(2);
  },
);
