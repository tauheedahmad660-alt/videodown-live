# VideoDown — Live Backend

This is a safe starter backend for downloading video files that you control or
are authorized to distribute. It does NOT implement a YouTube downloader.

## Local setup

1. Install Node.js 20+.
2. Open a terminal in this folder.
3. Run:
   npm install
4. Copy `.env.example` to `.env` and set:
   ALLOWED_HOSTS=your-media-domain.com
5. Run:
   npm start
6. Open http://localhost:3000

## Important

The API accepts only HTTPS URLs whose hostname is explicitly listed in
ALLOWED_HOSTS. This prevents the server from becoming a generic SSRF proxy.

The five quality buttons are UI choices. A real quality-specific system needs
separate 144p/360p/480p/720p/1080p media files (or your own authorized
transcoding pipeline) and a database/catalog mapping each quality to its file.

For deployment, set ALLOWED_HOSTS in the hosting provider's environment
variables and use the provider's assigned PORT. Do not commit secrets to git.

For YouTube content, use YouTube's permitted/official mechanisms rather than
bypassing its download restrictions.
