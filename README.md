# album

A minimal, private photo album. Photos are stored on Cloudflare R2; the
site itself is a small Next.js app you deploy to Vercel (or run locally).

- A single passcode gates uploading and deleting — the gallery itself is
  public by default (see below if you'd rather lock the whole thing).
- Photos display in a masonry grid, full-size in a lightbox on click.
- Uploads go straight from your browser to R2, so there's no server
  bottleneck for large files.
- Large photos (e.g. from a real camera) are automatically downscaled
  and re-compressed in your browser before upload — your originals on
  the memory card are never touched.
- R2 gives you free, unlimited bandwidth, so browsing the album never
  costs you anything beyond storage.

## 1. Set up Cloudflare R2

1. In the [Cloudflare dashboard](https://dash.cloudflare.com), go to
   **R2 Object Storage** and create a bucket (e.g. `photo-album`).
2. Under the bucket's **Settings** tab, enable **Public access** — this
   gives you a public URL like `https://pub-xxxxxxxx.r2.dev`. That's
   your `R2_PUBLIC_URL`. (A custom domain works too, if you'd rather.)
3. Still in **Settings**, add a **CORS policy** so your browser is
   allowed to upload directly to the bucket:
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["*"]
     }
   ]
   ```
   (You can tighten `AllowedOrigins` to your actual domain once it's
   live, e.g. `["https://your-album.vercel.app"]`.)
4. Go to **R2 > Manage API tokens** and create a token with **Object
   Read & Write** permission, scoped to your bucket. This gives you an
   **Access Key ID** and **Secret Access Key**.
5. Your **Account ID** is shown on the right side of the main R2 page
   in the dashboard.

## 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill it in:

```
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=photo-album
R2_PUBLIC_URL=https://pub-xxxxxxxx.r2.dev
ALBUM_PASSCODE=pick-something-only-you-know
```

## 3. Run it locally

```
npm install
npm run dev
```

Open <http://localhost:3000>. Click "unlock", enter your passcode, and
you'll land on `/upload` to add your first photos.

## 4. Deploy

Push this to a GitHub repo, then import it into
[Vercel](https://vercel.com/new). Add the same six environment variables
in the Vercel project settings, and deploy. That's it — no database, no
extra services.

## Notes

- **Making the whole album private:** right now anyone with the link can
  view the gallery, but only you can upload or delete. If you'd rather
  the whole site require the passcode, change the `matcher` in
  `middleware.ts` from `["/upload"]` to `["/upload", "/"]`.
- **Deleting photos:** while unlocked, hover any photo and click the ×
  in the corner.
- **How photos are tracked:** there's no database — the app keeps a
  small `manifest.json` file inside your R2 bucket listing every photo
  and its dimensions. You never need to touch it directly.
- **RAW files (.dng, .cr2, etc.):** browsers can't decode RAW formats,
  so the upload page will flag these and ask you to export a JPEG
  first (from your camera or editing software).
