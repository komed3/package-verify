import * as T from '../types';
import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

export class PackageVerifier {

    constructor (
        private readonly manifest: T.VerifyPkgNormalized,
        private readonly verbose: boolean
    ) {}

    private posix ( path: string ) : string {
        return path.replace( /\\/g, '/' ).replace( /\/+/g, '/' ).replace( /^\/+/, '' );
    }

    private async glob ( base: string ) : Promise< string[] > {
        const files: string[] = [];

        const traverse = async ( dir: string ) => {
            for ( const e of await readdir( dir, { withFileTypes: true } ) ) {
                const fullPath = join( dir, e.name );
                e.isDirectory() ? await traverse( fullPath ) : files.push(
                    this.posix( relative( base, fullPath ) )
                );
            }
        };

        await traverse( base );
        return files;
    }

    private log ( msg: string, method: keyof typeof console = 'log' ) : void {
        if ( this.verbose ) ( console as any )[ method ]( msg );
    }

    private logSeverity ( msg: string, severity: T.VerifyPkgSeverity ) : void {
        this.log( msg, severity === 'error' ? 'error' : 'warn' );
    }

    private logCheck ( exists: boolean, msg: string, severity: T.VerifyPkgSeverity ) : void {
        this.log( `${ exists ? '[OK]' : '[MISSING]' } ${msg}`,
            exists ? 'log' : severity === 'error' ? 'error' : 'warn'
        );
    }

    private async pathExists ( path: string ) : Promise< boolean > {
        try { const s = await stat( path ); return s.isFile() || s.isDirectory() }
        catch { return false }
    }

    private applyPolicy (
        result: T.VerifyPkgResult, exists: boolean,
        severity: T.VerifyPkgSeverity
    ) : void {
        if ( exists || severity === 'ignore' ) return;
        switch ( severity ) {
            case 'error': result.summary.errors++; break;
            case 'warn': result.summary.warnings++; break;
        }
    }

    private async checkFile (
        result: T.VerifyPkgResult, f: { relative: string; absolute: string },
        severity: T.VerifyPkgSeverity
    ) : Promise< void > {
        const exists = await this.pathExists( f.absolute );

        this.logCheck( exists, f.relative, severity );

        result.files.push( { ...f, exists, severity } );
        this.applyPolicy( result, exists, severity );
    }

    private async checkPattern (
        result: T.VerifyPkgResult, p: { base: string; pattern: string; regex: RegExp; },
        severity: T.VerifyPkgSeverity
    ) : Promise< void > {
        const matches = ( await this.glob( p.base ) ).filter( f => p.regex.test( f ) );
        const exists = matches.length > 0;

        this.logCheck( exists, `pattern: ${p.pattern} -> ${ matches.join( ', ' ) }`, severity );

        result.patterns.push( { ...p, exists, matches } );
        this.applyPolicy( result, exists, severity );
    }

    private async checkGroup (
        result: T.VerifyPkgResult, g: { relative: string; absolute: string }[],
        severity: T.VerifyPkgSeverity
    ) : Promise< void > {
        const groupResult: T.VerifyPkgCheckFile[] = [];
        let groupExists = false;

        for ( const f of g ) {
            const exists = await this.pathExists( f.absolute );

            groupResult.push( { ...f, exists, severity } );
            groupExists = groupExists || exists;

            this.logCheck( exists, `(group) ${f.relative}`, severity );
        }

        result.atLeastOne.push( { group: groupResult, valid: groupExists } );
        this.applyPolicy( result, groupExists, severity );
    }

    private async checkDerive ( result: T.VerifyPkgResult ) : Promise< void > {
        const { packageRoot, policy: { on: { deriveFailure: severity } }, derive } = this.manifest;
        if ( ! derive ) return;

        const { sources, rules, targets } = derive;
        const sourceFiles: string[] = [];

        const traverse = async ( dir: string ) => {
            for ( const e of await readdir( dir, { withFileTypes: true } ) ) {
                const fullPath = join( dir, e.name );
                const rel = this.posix( relative( sources.root, fullPath ) );

                e.isDirectory() ? await traverse( fullPath ) : sources.include.test( rel ) &&
                    ! sources.exclude.some( ex => ex.test( rel ) ) && sourceFiles.push( rel );
            }
        };

        await traverse( sources.root );

        for ( const src of sourceFiles ) {
            const matchingRules = rules.filter(
                r => Array.isArray( r.match ) && r.match.includes( src )
            );

            if ( matchingRules.length > 1 ) {
                this.log( `[DERIVE] multiple matching rules for ${src}`, 'error' );
                this.applyPolicy( result, false, severity );
                continue;
            }

            let rule = matchingRules[ 0 ];
            if ( ! rule ) {
                const defaults = rules.filter( r => r.default );
                if ( defaults.length !== 1 ) {
                    this.logSeverity( `[DERIVE] ${ defaults.length === 0 ? 'no' : 'multiple'
                        } default rule(s) for ${src}`, severity );

                    this.applyPolicy( result, false, severity );
                    continue;
                }

                rule = defaults[ 0 ];
            }

            const { mode } = rule, templates = targets[ mode ];
            if ( ! templates ) {
                this.logSeverity( `[DERIVE] no targets for mode "${mode}" (${src})`, severity );
                this.applyPolicy( result, false, severity );
                continue;
            }

            const [ dir, name, ext ] = [
                src.includes( '/' ) ? src.substring( 0, src.lastIndexOf( '/' ) ) : '',
                src.replace( /^.*\//, '' ).replace( /\.[^.]+$/, '' ),
                src.split('.').pop() ?? ''
            ];

            for ( const tpl of templates ) {
                const rel = this.posix( tpl.replace( '{dir}', dir ).replace( '{name}', name ).replace( '{ext}', ext ) );
                const abs = join( packageRoot, rel );
                const exists = await this.pathExists( abs );

                this.logCheck( exists, `(derive: ${mode}) ${rel}`, severity );

                result.derive.push( { mode, target: rel, absolute: abs, exists } );
                this.applyPolicy( result, exists, severity );
            }
        }
    }

    private collectAllowedFiles ( result: T.VerifyPkgResult ) : Set< string > {
        const allowed: Set< string > = new Set ();

        result.files.forEach( f => f.exists && allowed.add( f.relative ) );
        result.patterns.forEach( p => p.matches.forEach( m => allowed.add( m ) ) );
        result.atLeastOne.forEach( g => g.group.forEach( f => f.exists && allowed.add( f.relative ) ) );
        result.derive.forEach( d => d.exists && allowed.add( d.target ) );

        return allowed;
    }

    private async checkUnexpected ( result: T.VerifyPkgResult ) : Promise< void > {
        const { packageRoot, policy: { unexpectedFiles: severity } } = this.manifest;

        if ( severity === 'ignore' ) return;

        const allowed = this.collectAllowedFiles( result );
        const allFiles = await this.glob( packageRoot );

        for ( const f of allFiles ) {
            if ( allowed.has( f ) ) continue;
            const abs = join( packageRoot, f );

            this.logSeverity( `[UNEXPECTED] ${f}`, severity );

            result.unexpected.push( { relative: f, absolute: abs, severity } );
            this.applyPolicy( result, false, severity );
        }
    }

    public async verify () : Promise< T.VerifyPkgResult > {
        const { packageRoot, policy: { on: { missingExpected, emptyPattern } }, expect } = this.manifest;
        const result: T.VerifyPkgResult = {
            files: [], patterns: [], atLeastOne: [], derive: [], unexpected: [],
            summary: { errors: 0, warnings: 0 }
        };

        this.log( 'Starting package verification ...' );
        this.log( `Package root: ${packageRoot}` );
        this.log( `Policy: ${ JSON.stringify( this.manifest.policy, null, 2 ) }` );

        this.log( `Step 1 / 3: Checking expected files, patterns, and groups ...` );
        for ( const f of expect.files ) await this.checkFile( result, f, missingExpected );
        for ( const p of expect.patterns ) await this.checkPattern( result, p, emptyPattern );
        for ( const g of expect.atLeastOne ) await this.checkGroup( result, g, missingExpected );

        this.log( `Step 2 / 3: Checking derived files ...` );
        await this.checkDerive( result );

        this.log( `Step 3 / 3: Checking for unexpected files ...` );
        await this.checkUnexpected( result );

        return result;
    }

}
