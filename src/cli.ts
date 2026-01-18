import verifyPkg from './index';
import type { VerifyPkgOptions, VerifyPkgResult } from './types';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const VERSION = 'v1.0.0';
export const DEFAULT_MANIFEST = 'verify.manifest.json';

export async function main () : Promise< void > {}
