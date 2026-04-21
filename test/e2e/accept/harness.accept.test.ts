import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runFromManifest } from './manifest-runner.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
runFromManifest(resolve(HERE, 'manifest.yaml'));
