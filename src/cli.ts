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

const printSummary = ( result: VerifyPkgResult ) : void => {
    const { errors, warnings } = result.summary;

    if ( errors === 0 && warnings === 0 ) {
        console.log( '✔ Package verification passed' );
        return;
    }

    if ( errors > 0 ) console.error( `✖ ${errors} error${ errors === 1 ? '' : 's' } found` );
    if ( warnings > 0 ) console.warn( `⚠ ${warnings} warning${ warnings === 1 ? '' : 's' } found` );
}

export async function main () : Promise< void > {
    const args = parseArgs( process.argv.slice( 2 ) );

    if ( args.version ) {
        console.log( VERSION );
        return;
    }

    const options: VerifyPkgOptions = {
        manifestPath: resolve( String( args.manifest ?? DEFAULT_MANIFEST ) ),
        cwd: args.cwd ? resolve( String( args.cwd ) ) : undefined,
        verbose: Boolean( args.verbose )
    };

    const dryRun = Boolean( args[ 'dry-run' ] );
    const reportPath = args.report ? resolve( String( args.report ) ) : undefined;

    let result: VerifyPkgResult;
    try { result = await verifyPkg( options ) }
    catch ( err ) {
        console.error( '✖ Verification failed:' );
        console.error( ( err as Error ).message );
        process.exitCode = 1;
        return;
    }

    if ( reportPath ) await writeFile( reportPath, JSON.stringify( result, null, 2 ), 'utf8' );
    if ( options.verbose ) printSummary( result );
}
