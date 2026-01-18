import { VerifyPkgCheckFile, VerifyPkgNormalized, VerifyPkgSeverity, VerifyPkgResult } from '../types';
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
        try { const s = await stat( path ); return s.isFile() || s.isDirectory() }
        catch { return false }
    }

    private applyPolicy (
        result: VerifyPkgResult, exists: boolean,
        severity: VerifyPkgSeverity
    ) : void {
        if ( ! exists && severity === 'error' ) result.summary.errors++;
        if ( ! exists && severity === 'warn' ) result.summary.warnings++;
    }

    private async checkFile (
        result: VerifyPkgResult, f: { relative: string; absolute: string },
        severity: VerifyPkgSeverity
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
        severity: VerifyPkgSeverity
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
        severity: VerifyPkgSeverity
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

    private async checkDerive ( result: VerifyPkgResult ) : Promise< void > {
        const { packageRoot, policy: { on: { deriveFailure: severity } }, derive } = this.manifest;
        if ( ! derive ) return;

        const { sources, rules, targets } = derive;
        const sourceFiles: string[] = [];
        const includeRegex = new RegExp( sources.include );
        const exclude = sources.exclude ?? [];

        const traverse = async ( dir: string ) => {
            for ( const e of await readdir( dir, { withFileTypes: true } ) ) {
                const fullPath = join( dir, e.name );
                const rel = relative( sources.root, fullPath );

                e.isDirectory() ? await traverse( fullPath ) : includeRegex.test( rel ) &&
                    ! exclude.some( ex => rel === ex || rel.startsWith( ex + '/' ) ) &&
                    sourceFiles.push( rel );
            }
        };

        await traverse( sources.root );

        // 1. Source files
        for ( const src of sourceFiles ) {
            const rule = rules.find( r => r.match?.includes( src ) ) ?? rules.find( r => r.default );
            if ( ! rule ) {
                this.log( `[DERIVE] no rule for ${src}`, severity === 'error' ? 'error' : 'warn' );
                this.applyPolicy( result, false, severity );
                continue;
            }

            const { mode } = rule, templates = targets[ mode ];
            if ( ! templates ) {
                this.log( `[DERIVE] no targets for mode "${mode}" (${src})`, 'warn' );
                this.applyPolicy( result, false, severity );
                continue;
            }

            const [ dir, name, ext ] = [
                src.includes( '/' ) ? src.substring( 0, src.lastIndexOf( '/' ) ) : '',
                src.replace( /^.*\//, '' ).replace( /\.[^.]+$/, '' ),
                src.split('.').pop() ?? ''
            ];

            for ( const tpl of templates ) {
                const relTarget = tpl.replace( '{dir}', dir ).replace( '{name}', name ).replace( '{ext}', ext );
                const absTarget = join( packageRoot, relTarget );
                const exists = await this.pathExists( absTarget );

                this.log(
                    `${ exists ? '[OK]' : '[MISSING]' } (derive: ${mode}) ${relTarget}`,
                    exists ? 'log' : 'warn'
                );

                result.derive.push( { mode, target: relTarget, absolute: absTarget, exists } );
                this.applyPolicy( result, exists, severity );
            }
        }
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

        // 4. Check derive
        await this.checkDerive( result );

        return result;
    }

}
