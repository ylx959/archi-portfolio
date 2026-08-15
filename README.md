# YLX Studio Website

An interactive portfolio exploring the space between design and architecture, condensing a four-year journey through architectural education into crafted interfaces, motion systems, visual experiments, and project case studies.

![cover](public/assets/readme.png)

## Highlights

Project detail images use blurred low-resolution previews before the full images load.

After adding or changing project images in `scripts/mineport-project-data.js`, run:

```bash
node scripts/generate-previews.js
```

The script only creates missing files in `assets/images/previews`, so it is safe to run again.

## Asset versions

After changing local CSS or JavaScript, bump the cache-busting versions in `index.html`:

```bash
node scripts/bump-assets.js
```

The script increments only local `styles/*.css` and `scripts/*.js` references.
