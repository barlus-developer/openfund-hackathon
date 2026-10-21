# Funding images

Create a fund in **Funding Manager → Create** or edit an existing fund under **Settings**. Select one cover and up to 12 description images. Preview the images, add optional gallery captions, and use the up/down buttons to reorder them. Select a new cover to replace it, or remove images with their labeled buttons.

Use **Upload images**, then continue creating the fund or select **Save information and images** and confirm the existing `updateMetadata` transaction in MetaMask. Uploading alone does not change an existing fund. Failed uploads retain the current selections for retry; files that completed uploading are reused within the editing session. Unsaved local file selections do not survive navigation or reload. Published metadata references in the creation draft use the existing local draft cache.

## Storage

Images and JSON use the existing `uploadIPFS` adapter, Kubo/Pinata upload protocols, `VITE_IPFS_API_URL`, and `VITE_IPFS_GATEWAY`. No new service or contract deployment is required. The Docker development configuration already supplies the local IPFS endpoints. For other environments, use an HTTPS Kubo endpoint or Pinata signed upload URLs in the existing storage disclosure. A Pinata batch needs one unused signed URL for each new image plus one for the JSON document, one URL per line. Credentials and signed URLs stay in memory and clear after the upload attempt.

Supported input: JPEG, PNG, WebP, AVIF; maximum 5,000,000 bytes and 32 megapixels per file. The browser decodes images, strips source metadata through canvas encoding, and exports WebP (PNG fallback if WebP encoding is unavailable), with the longest edge capped at 1600 pixels. Animated inputs become a still image. Original proportions are retained; covers are cropped for display to 16:9. Gallery previews contain the full image.

The fund's existing `metadataURI` points to JSON with these additive fields:

```json
{
  "imageSchema": "openfund-images/1",
  "coverImage": {
    "uri": "ipfs://<cover-cid>",
    "width": 1600,
    "height": 900
  },
  "descriptionImages": [
    {
      "uri": "ipfs://<gallery-image-cid>",
      "width": 1200,
      "height": 1600,
      "caption": "Supplies for the community classroom"
    }
  ]
}
```

`coverImage` can be omitted or `null`; `descriptionImages` can be omitted or empty. Each caption is optional and limited to 300 characters. Width and height are optional for imported references. IPFS references, bare CIDs, and HTTP(S) image URLs use the existing gateway resolver. Executable/data/blob references in public metadata are ignored. Image bytes and browser preview URLs never enter the JSON or blockchain.

Existing top-level JSON fields are preserved when images change. Image editing waits for the existing JSON to load, preventing a failed read from silently overwriting the original project metadata. Non-JSON legacy links can still be saved with the existing URI field; to add structured image metadata, first migrate that document to JSON. Funds without images retain their existing title, summary, financial state, and donation controls and show a neutral image placeholder.

Manager updates submit the uploaded JSON's keccak256 digest through the existing `metadataHash` field. Reads verify a nonzero on-chain digest before showing images. Creation uses the existing `createFund` signature with its content-addressed metadata URI; no smart contract changes are needed. Metadata reads are limited to 256 KB, timed out, cached separately from financial reads, and failures do not block donations. Image files must remain pinned by the configured storage provider. Removing a reference does not unpin public IPFS content.

## Homepage artwork

Generated with the built-in image generation tool, then resized and encoded as responsive WebP assets:

- `app/src/assets/community-support-640.webp`
- `app/src/assets/community-support-960.webp`
- `app/src/assets/community-support-1440.webp`

The artwork is an illustration of community support, not a photograph of a funding project. Its alt text identifies it as an illustration. The final generation prompt is in [community-support-prompt.txt](community-support-prompt.txt).

The gallery uses the project's Base UI/shadcn dialog pattern, including focus trapping, Escape dismissal, and focus restoration. See the [shadcn dialog documentation](https://ui.shadcn.com/docs/components/base/dialog).
