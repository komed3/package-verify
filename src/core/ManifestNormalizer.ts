import { VerifyPkgManifest, VerifyPkgNormalized, VerifyPkgSeverity } from '../types';
import { resolve } from 'node:path';

export class ManifestNormalizer {

    private static policyLevel (
        level: any = undefined, fb: VerifyPkgSeverity
    ) : VerifyPkgSeverity {
        return [ 'error', 'warn', 'ignore' ].includes(
            ( level = String( level ).toLowerCase() )
        ) ? level : fb;
    }

    private static posix ( path: string ) : string {
        return path.replace( /\\/g, '/' ).replace( /\/+/g, '/' ).replace( /^\/+/, '' );
    }

    private static resolvePaths ( paths: string[], base: string ) : {
        relative: string, absolute: string
    }[] {
        return paths.map( f => ( {
            relative: this.posix( f ),
            absolute: this.posix( resolve( base, f ) )
        } ) );
    }

    private static resolveGlob ( glob: string ) : RegExp {
        return new RegExp(
            '^' + glob.replace( /[.+^${}()|[\]\\]/g, '\\$&' )
                .replace( /\*/g, '.*' )
                .replace( /\?/g, '.' ) + '$'
        );
    }

    private static resolvePattern ( patterns: string[], base: string ) : {
        base: string, pattern: string, regex: RegExp
    }[] {
        return patterns.map( p => ( { base, pattern: p, regex: this.resolveGlob( p ) } ) );
    }

    public static normalize (
        manifest: VerifyPkgManifest, cwd: string = process.cwd()
    ) : VerifyPkgNormalized {
        const packageRoot = resolve( cwd, manifest.context.packageRoot );

        const policy: VerifyPkgNormalized[ 'policy' ] = {
            defaultSeverity: this.policyLevel( manifest.policy?.defaultSeverity, 'error' ),
            unexpectedFiles: this.policyLevel( manifest.policy?.unexpectedFiles, 'warn' ),
            on: {
                missingExpected: this.policyLevel( manifest.policy?.on?.missingExpected, 'error' ),
                emptyPattern: this.policyLevel( manifest.policy?.on?.emptyPattern, 'warn' ),
                deriveFailure: this.policyLevel( manifest.policy?.on?.deriveFailure, 'warn' )
            }
        };

        const expect: VerifyPkgNormalized[ 'expect' ] = {
            files: this.resolvePaths( manifest.expect?.files ?? [], packageRoot ),
            patterns: this.resolvePattern( manifest.expect?.patterns ?? [], packageRoot ),
            atLeastOne: ( manifest.expect?.atLeastOne ?? [] ).map( g =>
                this.resolvePaths( g, packageRoot )
            )
        };

        const derive: VerifyPkgNormalized[ 'derive' ] = manifest.derive ? {
            sources: {
                root: this.posix( resolve( cwd, manifest.derive.sources.root ) ),
                include: this.resolveGlob( manifest.derive.sources.include ),
                exclude: ( manifest.derive.sources.exclude ?? [] ).map( ex =>
                    this.resolveGlob( ex )
                )
            },
            rules: manifest.derive.rules.map( r => ( {
                match: r.match ?? [],
                default: r.default ?? false,
                mode: r.mode
            } ) ),
            targets: manifest.derive.targets
        } : undefined;

        return { packageRoot, policy, expect, derive };
    }

}
