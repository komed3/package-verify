import { ManifestLoader } from './core/ManifestLoader';
import { ManifestNormalizer } from './core/ManifestNormalizer';
import { PackageVerifier } from './core/PackageVerifier';
import type * as T from './types';

export { ManifestLoader, ManifestNormalizer, PackageVerifier };
export type { T };

export default async function verifyPkg (
    opt: T.VerifyPkgOptions
) : Promise< T.VerifyPkgResult > {
    const { manifestPath, cwd, verbose = false } = opt;

    const manifest = await ManifestLoader.load( manifestPath );
    const normalized = ManifestNormalizer.normalize( manifest, cwd );

    const verifier = new PackageVerifier ( normalized, verbose );
    const result = await verifier.verify();

    return result;
}
