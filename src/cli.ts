import verifyPkg from './index';
import type { VerifyPkgOptions, VerifyPkgResult } from './types';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const VERSION = '1.0.0';
const DEFAULT_MANIFEST = 'verify.manifest.json';
