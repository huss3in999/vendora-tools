# Media Storage Strategy

Phase 1 supports images, videos, galleries, and profile media by storing external URL strings in `page_blocks.props_json`. It does not upload or store media files in D1.

## Why media should not go into D1

D1 is the relational data layer for users, workspaces, pages, blocks, sessions, short links, and analytics. Binary media would make the database slower, larger, and harder to back up or migrate. Images and videos also need delivery features that databases are not designed to provide, such as cacheable file responses, range requests, image resizing, and bandwidth controls.

## Current Phase 1 approach

- Store only external image/video URLs in block `props_json`.
- Validate URLs before saving blocks.
- Do not store uploaded media in D1.
- Keep public pages lightweight and fast.
- Keep an external image URL option available for free users.

## Future Cloudflare R2 plan

When uploads are added, use Cloudflare R2 for object storage and keep only metadata/URLs in D1. A future upload flow should:

- Upload original media to R2 or a private staging bucket.
- Compress and resize images before final storage.
- Generate web-friendly variants where practical, such as thumbnail and public display sizes.
- Store only file metadata, public URL/key, owner workspace, size, and content type in D1.
- Enforce per-account storage limits, especially on free plans.
- Enforce upload size limits and allowed MIME types.
- Keep external URL blocks available for free users who do not need hosted media.

## Free plan storage limits

A future free plan should include conservative limits, for example a small number of hosted images and a total workspace storage cap. Larger galleries, videos, and high-resolution assets should require a paid plan or external URLs until storage billing is implemented.
