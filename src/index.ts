import { ManifestLoader } from './core/ManifestLoader';
import { VerifyPkgOptions, VerifyPkgResult } from './types';

export async function verifyPackage ( options: VerifyPkgOptions ) : Promise< VerifyPkgResult > {
    const manifest = await ManifestLoader.load( options.manifestPath );

    return {};
}
