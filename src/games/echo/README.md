# Echo

A memory game. The cells of a sequence light up one after the other, then you repeat it. Each round adds one step. Every 3 rounds the grid splits into more cells, from 2×2 up to 6×6; past that, the playback speeds up.

## Play

| Key       | Action                           |
| :-------- | :------------------------------- |
| `w a s d` | Move the cursor                  |
| `e`       | Select the cell under the cursor |

You have 30 seconds to repeat the whole sequence of a round. A wrong cell or the end of the time ends the game and shows the expected cell in red. Input is ignored while the sequence plays.

The score is the number of rounds passed. A pause in the middle of a round replays it from its first step, with the full 30 seconds.

## Manual checks

Part of the manual protocol of [CONTRIBUTING.md](../../../CONTRIBUTING.md#manual-protocol):

- The playback lights the cells one by one, then the countdown runs.
- A round played with `w a s d` and `e`, no key lost.
- A wrong cell and a timeout both end the game, the expected cell in red.
- `p` during the answer, then `p` again: the round replays with 30 seconds.
- Reach round 4 to see the 2×2 grid split into 3×3.
