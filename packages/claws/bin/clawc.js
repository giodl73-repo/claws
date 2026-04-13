#!/usr/bin/env node
// claws CLI entry point
import { createProgram } from '../dist/cli.js';

const program = createProgram();

program.parseAsync(process.argv).catch((err) => {
  console.error(`claws: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 2;
});
