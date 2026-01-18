import { ManifestLoader } from './core/ManifestLoader';
import { ManifestNormalizer } from './core/ManifestNormalizer';
import { PackageVerifier } from './core/PackageVerifier';
import { VerifyPkgOptions, VerifyPkgResult } from './types';

export default async function verifyPackage ( opt: VerifyPkgOptions ) : Promise< VerifyPkgResult > {
    const { manifestPath, cwd, verbose = false } = opt;

    const manifest = await ManifestLoader.load( manifestPath );
    const normalized = ManifestNormalizer.normalize( manifest, cwd );

    const verifier = new PackageVerifier ( normalized, verbose );
    const result = await verifier.verify();

    return result;
}
