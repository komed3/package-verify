import { VerifyPkgManifest, VerifyPkgNormalized, VerifyPkgPolicyLevel } from '../types';
import { resolve } from 'node:path';

export class ManifestNormalizer {

    private static policyLevel ( level: any = undefined, fb: VerifyPkgPolicyLevel ) : VerifyPkgPolicyLevel {
        return [ 'error', 'warn', 'ignore' ].includes( ( level = String( level ).toLowerCase() ) ) ? level : fb;
    }

    private static resolvePaths ( paths: string[], root: string ) : { relative: string, absolute: string }[] {
        return paths.map( f => ( { relative: f, absolute: resolve( root, f ) } ) );
    }

    public static normalize (
        manifest: VerifyPkgManifest,
        cwd: string = process.cwd()
    ) : VerifyPkgNormalized {
        const packageRoot = resolve( cwd, manifest.context.packageRoot );

        const policy: VerifyPkgNormalized[ 'policy' ] = {
            defaultSeverity: this.policyLevel( manifest.policy?.defaultSeverity, 'error' ),
            failOnWarnings: !! ( manifest.policy?.failOnWarnings ?? false ),
            unexpectedFiles: this.policyLevel( manifest.policy?.unexpectedFiles, 'warn' ),
            on: {
                missingExpected: this.policyLevel( manifest.policy?.on?.missingExpected, 'error' ),
                emptyPattern: this.policyLevel( manifest.policy?.on?.emptyPattern, 'warn' ),
                deriveFailure: this.policyLevel( manifest.policy?.on?.deriveFailure, 'warn' )
            }
        };

        const expect: VerifyPkgNormalized[ 'expect' ] = {
            files: this.resolvePaths( manifest.expect?.files ?? [], packageRoot ),
            patterns: ( manifest.expect?.patterns ?? [] ).map( p => ( {
                pattern: p, resolvedBase: packageRoot
            } ) ),
            atLeastOne: ( manifest.expect?.atLeastOne ?? [] ).map( g =>
                this.resolvePaths( g, packageRoot )
            )
        };

        return { packageRoot, policy, expect };
    }

}
