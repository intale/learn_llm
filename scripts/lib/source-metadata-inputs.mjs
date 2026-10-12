// Minimal local inputs for the existing source-image recipe. Full acquisition
// evidence is verified separately from an explicitly exported MCP checkpoint.
import {readRegularFile,jsonFile,closed,hash} from './bound-files.mjs';

export const SOURCE_METADATA_MANIFEST = 'configs/course-source-metadata-v1.json';
export const SOURCE_ASSET_CONFIG = 'configs/functional-corpus-assets.json';
export const SOURCE_ASSET_CONFIG_SHA256 = '5d21797249134bc6cc2b4e71b49394a642550d60201b572a93889800c867e4a7';
export const SOURCE_ASSET_SHA256 = 'd4e684b105b9695ec5b31e5d6ecc4fe44a60d66c591707311ef537d1df95ac3d';
export const ORIGINAL_METADATA_INVENTORY = 'artifacts/functional-laptop/step-output-inventories/capture-functional-tinystories-source-metadata.json';
const ORIGINAL_METADATA_SHA256 = '1e5c11b46760cd9066c4ab56f4cb04af13b36f8aae6dfc59bd230c4b98c84463';
const ORIGINAL_BINDING = 'artifacts/functional-laptop/acquisition/tinystories/content-v2-production-binding.json';
const ORIGINAL_BINDING_SHA256 = 'ca16ccb752576b00bed29a0109323ea91456465f542dd4cbd1358707e52106f6';
const LOCAL_METADATA = Object.freeze({
  attribution:'scripts/data/tinystories/attribution-and-permission.json',
  license:'scripts/data/tinystories/cdla-page-text.txt',
});
export function verifySourceMetadata(root) {
  if(hash(readRegularFile(root,SOURCE_ASSET_CONFIG))!==SOURCE_ASSET_CONFIG_SHA256) throw new Error('accepted source recipe drift');
  const config=jsonFile(root,SOURCE_ASSET_CONFIG);
  const asset=config.assets?.[config.default_asset];
  if(config.schema_version!==2 || config.default_asset!=='tinystories-raw-pair' ||
      hash(Buffer.from(JSON.stringify(asset)+'\n'))!==SOURCE_ASSET_SHA256) throw new Error('selected source policy drift');
  const manifest=jsonFile(root,SOURCE_METADATA_MANIFEST,32768,true);
  closed(manifest,['schemaVersion','assetConfig','assetConfigSha256','selectedAssetSha256','files'],'source metadata inputs');
  if(manifest.schemaVersion!==1 || manifest.assetConfig!==SOURCE_ASSET_CONFIG ||
      manifest.assetConfigSha256!==SOURCE_ASSET_CONFIG_SHA256 || manifest.selectedAssetSha256!==SOURCE_ASSET_SHA256 ||
      !Array.isArray(manifest.files) || manifest.files.length!==2) throw new Error('source metadata identity');
  const expectedIds=Object.keys(LOCAL_METADATA);
  for(const [index,file] of manifest.files.entries()) {
    closed(file,['id','path','bytes','sha256'],'source metadata file');
    const expected=asset.manifest_recipe.payload.find(p=>p.id===expectedIds[index]);
    const bytes=readRegularFile(root,file.path);
    if(file.id!==expectedIds[index] || file.path!==LOCAL_METADATA[file.id] ||
        !Number.isSafeInteger(file.bytes) || file.bytes!==expected?.bytes || bytes.length!==file.bytes ||
        file.sha256!==expected?.sha256 || hash(bytes)!==file.sha256) throw new Error('source metadata byte/coverage drift');
  }
  return {manifest,asset};
}
export function verifySourceProductionHistory(root,historyRoot,{stepId,targetId}) {
  if(typeof historyRoot!=='string' || !historyRoot) throw new Error('explicit exported source history required');
  const {asset}=verifySourceMetadata(root);
  if(hash(readRegularFile(historyRoot,SOURCE_ASSET_CONFIG))!==SOURCE_ASSET_CONFIG_SHA256 ||
      hash(readRegularFile(historyRoot,ORIGINAL_METADATA_INVENTORY))!==ORIGINAL_METADATA_SHA256 ||
      hash(readRegularFile(historyRoot,ORIGINAL_BINDING))!==ORIGINAL_BINDING_SHA256)
    throw new Error('original source provenance identity drift');
  const inventory=jsonFile(historyRoot,ORIGINAL_METADATA_INVENTORY);
  if(inventory.step_id!=='capture-functional-tinystories-source-metadata' || inventory.files?.length!==14)
    throw new Error('complete original source metadata inventory required');
  const accepted=jsonFile(historyRoot,ORIGINAL_BINDING);
  if(accepted.schema_version!==2 || accepted.step_id!==stepId || accepted.target_id!==targetId ||
      accepted.metadata_inventory_sha256!==ORIGINAL_METADATA_SHA256 || accepted.binding?.selected_asset_sha256!==SOURCE_ASSET_SHA256 ||
      accepted.producer_inputs?.length!==16) throw new Error('complete accepted source producer binding required');
  for(const file of [...inventory.files,...accepted.producer_inputs]) {
    const bytes=readRegularFile(historyRoot,file.path);
    if(bytes.length!==file.bytes || hash(bytes)!==file.sha256) throw new Error('original source producer input drift');
  }
  return {asset,accepted};
}
