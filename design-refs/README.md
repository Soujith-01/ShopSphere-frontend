# Design references — Paperpillar E-commerce Website UI Kit

Drop the exported screens from the Figma file here. I read these images directly and
reproduce them; nothing here is shipped in the build.

Figma file: https://www.figma.com/design/fEpGvFsXjVmqpx0BMOcDbU/E-commerce-Website-UI-Kit---Paperpillar--Community-
Target node: `71:983`

## How to export from Figma

1. Select the frame (not a layer) on the canvas.
2. Use the **Export** panel (bottom of the right sidebar).
3. Set **PNG**, scale **2x** (crisper detail for reading spacing and type).
4. Export, then move the file into this folder.

If a frame is huge, exporting at **1x** is fine — readability matters more than scale.

## What I need, in priority order

The **style guide is the most valuable export** — it is the source of truth for the
color and typography tokens that drive every other screen.

1. `00-style-guide.png` — the Typography + Color style guide page
2. `01-home.png` — Home / landing page (desktop)
3. `02-catalog.png` — Product listing / category / shop page
4. `03-product.png` — Product detail page
5. `04-cart.png` — Cart page
6. `05-checkout.png` — Checkout / payment
7. `06-auth.png` — Login / register
8. `07-components.png` — Components / UI kit sheet (buttons, inputs, cards, badges, nav)
9. `08-*.png` — any remaining screens (wishlist, orders, profile, search, empty states)
10. `99-mobile-*.png` — the responsive/mobile version of the above

Name files roughly as above (`home.png`, `pdp.png`, …) — I match by filename, and the
order in the list above is the order I will implement them in.

## Notes

- Screenshots of a **running prototype** are fine too, as long as they are full-page
  and legible.
- If a screen has hover / active / disabled states drawn next to it, export that
  region as well — those states get built into the components.
- There is no Figma counterpart for the seller / admin / support / delivery
  dashboards, so those will follow this same design system rather than a literal frame.
