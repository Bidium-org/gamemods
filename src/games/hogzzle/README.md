# Hogzzle

A picture puzzle on PostHog's hedgehog, Max. The picture is cut into tiles and shuffled: swap tiles two by two until it is whole again.

Desktop only for now. In a terminal, Hogzzle opens and says it is not playable there.

## Play

| Key       | Action                                                                          |
| :-------- | :------------------------------------------------------------------------------ |
| `w a s d` | Move the cursor                                                                 |
| `e`       | Pick the tile under the cursor; on another tile, swap the two; on it, drop it  |
| `n`       | Next picture                                                                    |
| `f`       | Next level; after the hardest, back to the easiest                              |

- A new game draws one of five pictures at random, at the easiest level. `r` draws another picture at the current level.
- Levels: 3×3, 4×4, 5×5, 6×6 for the square pictures; 4×2, 6×3, 8×4 for the wide ones.
- The puzzle is solved when the picture looks whole: tiles that look the same, like plain background, count in each other's place. Solved, the picture shows whole in a green frame and the tiles stop moving.
- The score is the number of puzzles solved in a row. `n`, `f` or `r` on an unsolved puzzle gives it up and ends the streak; after a solved one they keep it. The swap count is shown, never scored.

## Pictures

The pictures are © PostHog, Inc., from https://posthog.com/media, used unmodified (only resized and re-encoded) and not covered by this repository's MIT license. Hogzzle is not a PostHog product and is not endorsed by PostHog. Details: [NOTICE.md](NOTICE.md).

## How it is built

- `hogzzle.ts` is the game, pure: it describes a `PictureBoard` (`board.ts`), which picture, the grid, which piece sits in each slot, the cursor, the pick. It knows nothing of how the board is drawn.
- `svg.ts` draws a `PictureBoard` on Desktop: the picture once in `<defs>`, one nested `<svg>` per slot whose `viewBox` shows its piece. `src/render/board.ts` routes picture boards to it. Platform limits it lives with: [ARCHITECTURE.md → Platform constraints](../../../docs/ARCHITECTURE.md#platform-constraints).
- `pictures.gen.ts` (names, grids, tiles that look the same) and `images.gen.ts` (the encoded pictures) were generated from PostHog's originals by a script since removed ([NOTICE.md](NOTICE.md#how-they-were-prepared)). Each picture gets the widest encoding, up to 640 px, that leaves room for the board under the `Svg` cap. Two tiles look the same when every block of an 8×8 sampling differs by at most 8 per color channel.

## Manual checks

Part of the manual protocol of [CONTRIBUTING.md](../../../CONTRIBUTING.md#manual-protocol):

- Desktop: every picture at every level (`n`, `f`), a puzzle solved, the pause veiling the picture, `/reload-plugins` mid-game with the picture still following the keys, a 6×6 and an 8×4 played without visible lag.
- Terminal: the "not playable here" message, then `q` back to the menu.
