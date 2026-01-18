import { VerifyPkgCheckFile, VerifyPkgNormalized, VerifyPkgSeverity, VerifyPkgResult } from '../types';
import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

export class PackageVerifier {

    constructor (
        private readonly manifest: VerifyPkgNormalized,
        private readonly verbose: boolean
    ) {}

    private async glob ( base: string ) : Promise< string[] > {
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
        return files;
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
        if ( exists || severity === 'ignore' ) return;
        switch ( severity ) {
            case 'error': result.summary.errors++; break;
            case 'warn': result.summary.warnings++; break;
        }
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
        const matches = ( await this.glob( p.base ) ).filter( f => p.regex.test( f ) );
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

    private collectAllowedFiles ( result: VerifyPkgResult ) : Set< string > {
        const allowed: Set< string > = new Set ();

        result.files.forEach( f => f.exists && allowed.add( f.relative ) );
        result.patterns.forEach( p => p.matches.forEach( m => allowed.add( m ) ) );
        result.atLeastOne.forEach( g => g.group.forEach( f => f.exists && allowed.add( f.relative ) ) );
        result.derive.forEach( d => d.exists && allowed.add( d.target ) );

        return allowed;
    }

    private async checkUnexpected ( result: VerifyPkgResult ) : Promise< void > {
        const { packageRoot, policy: { unexpectedFiles: severity } } = this.manifest;

        if ( severity === 'ignore' ) return;

        const allowed = this.collectAllowedFiles( result );
        const allFiles = await this.glob( packageRoot );

        for ( const f of allFiles ) {
            if ( allowed.has( f ) ) continue;
            const abs = join( packageRoot, f );

            this.log( `[UNEXPECTED] ${f}`, severity === 'error' ? 'error' : 'warn' );

            result.unexpected.push( { relative: f, absolute: abs, severity } );
            this.applyPolicy( result, false, severity );
        }
    }

    public async verify () : Promise< VerifyPkgResult > {
        const { policy: { on: { missingExpected, emptyPattern } }, expect } = this.manifest;
        const result: VerifyPkgResult = {
            files: [], patterns: [], atLeastOne: [], derive: [], unexpected: [],
            summary: { errors: 0, warnings: 0 }
        };

        for ( const f of expect.files ) await this.checkFile( result, f, missingExpected );
        for ( const p of expect.patterns ) await this.checkPattern( result, p, emptyPattern );
        for ( const g of expect.atLeastOne ) await this.checkGroup( result, g, missingExpected );

        await this.checkDerive( result );
        await this.checkUnexpected( result );

        return result;
    }

}
