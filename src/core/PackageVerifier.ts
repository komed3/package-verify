import { VerifyPkgNormalized, VerifyPkgPolicyLevel, VerifyPkgResult } from '../types';
import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

export class PackageVerifier {

    constructor (
        private readonly manifest: VerifyPkgNormalized,
        private readonly verbose: boolean
    ) {}

    private log ( msg: string, method: keyof typeof console = 'log' ) {
        if ( this.verbose ) ( console as any )[ method ]( msg );
    }

    private applyPolicy (
        result: VerifyPkgResult, exists: boolean, severity: VerifyPkgPolicyLevel
    ) : VerifyPkgResult {
        if ( ! exists && severity !== 'ignore' ) result.summary[
            severity === 'error' ? 'errors' : 'warnings'
        ]++;

        return result;
    }

    private async checkFile (
        result: VerifyPkgResult, f: { relative: string; absolute: string },
        severity: VerifyPkgPolicyLevel
    ) : Promise< VerifyPkgResult > {
        const test = await stat( f.absolute );
        const exists = test.isFile() || test.isDirectory();

        this.log( `${ exists ? '[OK]' : '[MISSING]' } ${ f.relative }`, exists ? 'log' : 'warn' );

        result.files.push( { ...f, exists, severity } );
        return this.applyPolicy( result, exists, severity );
    }

    private async glob ( base: string, regex: RegExp ) : Promise< string[] > {
        const files: string[] = [];

        const traverse = async ( dir: string ) => {
            for ( const e of await readdir( dir, { withFileTypes: true } ) ) {
                const fullPath = join( dir, e.name );
                e.isDirectory() ? await traverse( fullPath ) : files.push(
                    relative( base, fullPath )
                );
            }
        };

        await traverse( base );
        return files.filter( f => regex.test( f ) );
    }

    public async verify () : Promise< VerifyPkgResult > {
        const result: VerifyPkgResult = {
            files: [], patterns: [], atLeastOne: [], derive: [],
            summary: { errors: 0, warnings: 0 }
        };

        return result;
    }

}
