import verifyPkg from './index';
import type { VerifyPkgOptions, VerifyPkgResult } from './types';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const VERSION = 'v1.0.0';
export const DEFAULT_MANIFEST = 'verify.manifest.json';

const parseArgs = ( argv: string[] ) => argv.reduce( ( args, a ) => {
    if ( a.startsWith( '--' ) ) {
        const [ key, value ] = a.slice( 2 ).split( '=' );
        args[ key ] = value ?? true;
    } return args;
}, {} as Record< string, string | boolean > );

export async function main () : Promise< void > {
    const args = parseArgs( process.argv.slice( 2 ) );

    if ( args.version ) {
        console.log( VERSION );
        return;
    }
}
