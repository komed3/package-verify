import { ManifestLoader } from './core/ManifestLoader';

export async function verifyPackage ( options: {
    manifestPath: string
    verbose?: boolean
} ) {
    const manifest = await ManifestLoader.load( options.manifestPath );
}
