import { ManifestLoader } from './core/ManifestLoader';
import { ManifestNormalizer } from './core/ManifestNormalizer';
import { VerifyPkgOptions, VerifyPkgResult } from './types';

export default async function verifyPackage ( opt: VerifyPkgOptions ) : Promise< VerifyPkgResult > {
    const manifest = await ManifestLoader.load( opt.manifestPath );
    const normalized = ManifestNormalizer.normalize( manifest, opt.cwd );

    return {};
}
