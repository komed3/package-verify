import { ManifestLoader } from './core/ManifestLoader';
import { VerifyPkgOptions } from './types';

export async function verifyPackage ( options: VerifyPkgOptions ) {
    const manifest = await ManifestLoader.load( options.manifestPath );
}
