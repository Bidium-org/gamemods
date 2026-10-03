# Pictures

The pictures in this folder are © PostHog, Inc. They are not covered by this repository's MIT license.

They come unmodified from PostHog's media page, https://posthog.com/media:

| File                                | Section of the media page |
| :---------------------------------- | :------------------------ |
| `avatar-professor-max.png`          | Hedgehog avatars          |
| `avatar-builder-max.png`            | Hedgehog avatars          |
| `banner-posthog-array-blog.png`     | Banner images             |
| `banner-posthog-ceo-diary-blog.png` | Banner images             |
| `banner-posthog-features.jpg`       | Banner images             |

Hogzzle shows them as PostHog drew them: only resized and re-encoded to fit the console, never cropped, recolored or redrawn. Hogzzle is not a PostHog product and is not endorsed by PostHog. PostHog's brand rules: https://posthog.com/handbook/brand/assets.

## Regenerate the prepared pictures

`pnpm hogzzle:pictures` runs `scripts/hogzzle-pictures.mjs`, which reads this folder and writes `src/games/hogzzle/pictures.gen.ts` (names, grids, tiles that look the same) and `src/games/hogzzle/images.gen.ts` (the encoded pictures). Both are committed: installing the plugin runs no build.
