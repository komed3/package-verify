import { ManifestLoader } from './core/ManifestLoader';
import { VerifyPkgOptions, VerifyPkgResult } from './types';

export default async function verifyPackage ( opt: VerifyPkgOptions ) : Promise< VerifyPkgResult > {
    const manifest = await ManifestLoader.load( opt.manifestPath );

    return {};
}
