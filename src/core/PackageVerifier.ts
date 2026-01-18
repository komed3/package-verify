import { VerifyPkgCheckFile, VerifyPkgNormalized, VerifyPkgPolicyLevel, VerifyPkgResult } from '../types';
import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

export class PackageVerifier {

    constructor (
        private readonly manifest: VerifyPkgNormalized,
        private readonly verbose: boolean
    ) {}

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

    private log ( msg: string, method: keyof typeof console = 'log' ) {
        if ( this.verbose ) ( console as any )[ method ]( msg );
    }

    private async pathExists ( path: string ) : Promise< boolean > {
        const test = await stat( path );
        return test.isFile() || test.isDirectory();
    }

    private applyPolicy (
        result: VerifyPkgResult, exists: boolean,
        severity: VerifyPkgPolicyLevel
    ) : void {
        if ( ! exists && severity === 'error' ) result.summary.errors++;
        if ( ! exists && severity === 'warn' ) result.summary.warnings++;
    }

    private async checkFile (
        result: VerifyPkgResult, f: { relative: string; absolute: string },
        severity: VerifyPkgPolicyLevel
    ) : Promise< void > {
        const exists = await this.pathExists( f.absolute );

        this.log(
            `${ exists ? '[OK]' : '[MISSING]' } ${ f.relative }`,
            exists ? 'log' : 'warn'
        );

        result.files.push( { ...f, exists, severity } );
        this.applyPolicy( result, exists, severity );
    }

    private async checkPattern (
        result: VerifyPkgResult, p: { base: string; pattern: string; regex: RegExp; },
        severity: VerifyPkgPolicyLevel
    ) : Promise< void > {
        const matches = await this.glob( p.base, p.regex );
        const exists = matches.length > 0;

        this.log(
            `${ exists ? '[OK]' : '[MISSING]' } pattern: ${p.pattern} -> ${ matches.join( ', ' ) }`,
            exists ? 'log' : 'warn'
        );

        result.patterns.push( { ...p, exists, matches } );
        this.applyPolicy( result, exists, severity );
    }

    private async checkGroup (
        result: VerifyPkgResult, g: { relative: string; absolute: string }[],
        severity: VerifyPkgPolicyLevel
    ) : Promise< void > {
        const groupResult: VerifyPkgCheckFile[] = [];
        let groupExists = false;

        for ( const f of g ) {
            const exists = await this.pathExists( f.absolute );

            groupResult.push( { ...f, exists, severity } );
            groupExists = groupExists || exists;

            this.log(
                `${ exists ? '[OK]' : '[MISSING]' } (group) ${f.relative}`,
                exists ? 'log' : 'warn'
            );
        }

        result.atLeastOne.push( { group: groupResult, valid: groupExists } );
        if ( ! groupExists ) result.summary.errors++;
    }

    public async verify () : Promise< VerifyPkgResult > {
        const { policy, expect } = this.manifest;
        const result: VerifyPkgResult = {
            files: [], patterns: [], atLeastOne: [], derive: [],
            summary: { errors: 0, warnings: 0 }
        };

        // 1. Expect files
        for ( const f of expect.files ) {
            await this.checkFile( result, f, policy.on.missingExpected );
        }

        // 2. Expect patterns
        for ( const p of expect.patterns ) {
            await this.checkPattern( result, p, policy.on.emptyPattern );
        }

        // 3. At least one groups
        for ( const g of expect.atLeastOne ) {
            await this.checkGroup( result, g, policy.on.missingExpected );
        }

        return result;
    }

}
