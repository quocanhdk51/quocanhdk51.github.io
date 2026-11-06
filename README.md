# Alex Bui: CV + portfolio

```
cv/cv.html            CV source (single column, ATS-safe). Edit this, then build.
site/index.html       Portfolio page (all content is real HTML; JS only adds motion)
site/assets/          styles.css, main.js (GSAP + ScrollTrigger + Lenis from CDN)
profile.json          LinkedIn / portfolio URLs; empty = left out of CV and site
scripts/build.mjs     → dist/: Alex_Bui_CV.pdf, index.html, assets/ ; verifies the PDF text layer
scripts/screenshots.mjs  visual check of the CV and the site (desktop + mobile)
```

    npm run build    # build dist/ and check the PDF extracts as clean text, ≤ 2 pages
    npm run serve    # http://localhost:4173
    npm run shots    # PNGs in ./shots

Deploy: `npm run deploy:prep` copies the build to `docs/`; push to main and GitHub Pages serves it at https://quocanhdk51.github.io

ATS notes for the CV: one column, standard headings, no tables/icons/images, contact in the body,
ligatures and heading letter-spacing off (both split words in PDF text extraction), tagged PDF.
