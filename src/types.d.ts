export type VerifyPkgPolicyLevel = 'error' | 'warn' | 'ignore';

export interface VerifyPkgOptions {
    manifestPath: string;
    verbose?: boolean;
}

export interface VerifyPkgManifest {
    meta: {
        manifestVersion: 1;
    };
    context: {
        packageRoot: string;
    };
    policy: {
        defaultSeverity: VerifyPkgPolicyLevel;
        failOnWarnings?: boolean;
        unexpectedFiles?: VerifyPkgPolicyLevel;
        on?: {
            missingExpected?: VerifyPkgPolicyLevel;
            emptyPattern?: VerifyPkgPolicyLevel;
            deriveFailure?: VerifyPkgPolicyLevel;
        };
    };
    expect: {
        files?: string[];
        patterns?: string[];
        atLeastOne?: string[][];
    };
    derive?: {
        sources: {
            root: string;
            include: string;
            exclude?: string[];
        };
        rules: Array< {
            match?: string[];
            default?: boolean;
            mode: string;
        } >;
        targets: Record< string, string[] >;
    };
}

export interface VerifyPkgResult {}
