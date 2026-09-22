# FOULPLAY theme

Follow `~/.agents/sites/_BASELINE-shopify-theme.md`.

## Project rules

- Use `rishi@subject-matter.studio` as the author for new section, block, and snippet comment blocks.
- Keep each page area as an independent reusable section.
- Use theme blocks for reusable media, copy, products, articles, and benefits.
- Store all visible copy in settings, blocks, Shopify resources, metafields, or metaobjects.
- Use Shopify image settings for supplied media. Do not expose fallback artwork selectors.
- Add `data-no-fade` to pixel-critical pictures. The media manager otherwise applies its global image fade.
- Validate homepage section top positions and heights against the 1440px Figma root frame before mobile work.
- Run the local Vite server over HTTP. A self-signed HTTPS certificate blocks preview styles in the collaborative browser.
- Keep the supplied Neue Haas Text and Microgramma Extended webfonts in `public/`. Their `@font-face` rules live in `snippets/css-variables.liquid`.
- For section-by-section work, use the direct node export and raw assets. Do not inspect every asset subtree when those files are sufficient.
