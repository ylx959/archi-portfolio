# YLX Studio Website

This website is open for reference and borrowing.

Feel free to use the layout, structure, or interaction ideas for your own project.

Please keep the work respectful.
Do not claim the original content, images, or identity as your own.



## Running it

Built with [Vite](https://vite.dev), scrolling by [Lenis](https://lenis.darkroom.engineering), animation by [GSAP](https://gsap.com) with ScrollTrigger.

```bash
npm install
npm run dev        # http://localhost:8000
npm run build      # -> dist/
npm run preview    # serve the built site
```

Pushing to `main` builds and publishes to GitHub Pages via `.github/workflows/deploy.yml`; `dist/` is not committed.

## Image previews

Project detail images use blurred low-resolution previews before the full images load.

After adding or changing project images in `scripts/mineport-project-data.js`, run:

```bash
node scripts/generate-previews.js
```

The script only creates missing files in `public/assets/images/previews`, so it is safe to run again.
