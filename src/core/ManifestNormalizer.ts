import { VerifyPkgManifest, VerifyPkgPolicyLevel } from '../types';
import { resolve } from 'node:path';

export class ManifestNormalizer {

    private static policyLevel ( level: any = undefined, fb: VerifyPkgPolicyLevel ) : VerifyPkgPolicyLevel {
        return [ 'error', 'warn', 'ignore' ].includes( ( level = String( level ).toLowerCase() ) ) ? level : fb;
    }

    public static normalize (
        manifest: VerifyPkgManifest,
        cwd: string = process.cwd()
    ) : any {
        const pkgRoot = resolve( cwd, manifest.context.packageRoot );

        const policy = {
            defaultSeverity: this.policyLevel( manifest.policy?.defaultSeverity, 'error' ),
            failOnWarnings: manifest.policy?.failOnWarnings ?? false,
            unexpectedFiles: this.policyLevel( manifest.policy?.unexpectedFiles, 'warn' ),
            on: {
                missingExpected: this.policyLevel( manifest.policy?.on?.missingExpected, 'error' ),
                emptyPattern: this.policyLevel( manifest.policy?.on?.emptyPattern, 'warn' ),
                deriveFailure: this.policyLevel( manifest.policy?.on?.deriveFailure, 'warn' )
            }
        };
    }

}
