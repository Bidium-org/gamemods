# Pictures

The pictures Hogzzle shows (`images.gen.ts`) are © PostHog, Inc. They are not covered by this repository's MIT license.

They come unmodified from PostHog's media page, https://posthog.com/media:

| Original                                | Section of the media page |
| :---------------------------------- | :------------------------ |
| `avatar-professor-max.png`          | Hedgehog avatars          |
| `avatar-builder-max.png`            | Hedgehog avatars          |
| `banner-posthog-array-blog.png`     | Banner images             |
| `banner-posthog-ceo-diary-blog.png` | Banner images             |
| `banner-posthog-features.jpg`       | Banner images             |

Hogzzle shows them as PostHog drew them: only resized and re-encoded to fit the pane, never cropped, recolored or redrawn. Hogzzle is not a PostHog product and is not endorsed by PostHog. PostHog's brand rules: https://posthog.com/handbook/brand/assets.

## How they were prepared

`scripts/hogzzle-pictures.mjs` read the originals and wrote `pictures.gen.ts` (names, grids, tiles that look the same) and `images.gen.ts` (the encoded pictures). The originals, the script and its `sharp` dependency were then removed: to regenerate, restore them from git history (`git log -- scripts/hogzzle-pictures.mjs`).
