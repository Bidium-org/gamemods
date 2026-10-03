# 2048

Slide the tiles of a 4×4 grid. Two equal tiles that meet merge into one, their sum. After each move that changes the grid, a new tile appears on a free cell: a 2, or a 4 one time in ten.

## Play

| Key       | Action                                   |
| :-------- | :--------------------------------------- |
| `w a s d` | Slide every tile up, left, down or right |

The score adds up the value of every merged tile. Reaching 2048 does not end the game: keep going for a higher score. The game ends when no move is left.

## Manual checks

Part of the manual protocol of [CONTRIBUTING.md](../../../CONTRIBUTING.md#manual-protocol):

- A move with `w a s d` slides and merges the tiles, then spawns one; a move that changes nothing spawns nothing.
- Values from 2 to 4 digits stay centered and readable in their tile.
- A game played until no move is left: "No moves left · R to play again", the best score kept.
- `p` dims the tiles and ignores `w a s d`.
- Desktop draws the board as an image: each move slides its tiles, pops the merges, grows the new tile and floats the gain (`+4`) once, then the board stays still. A click, `p` or the band after it settles replays nothing.
- Terminal draws the board in a `Client`: the same move animates in color in about half a second, and the board fits a shorter pane by shrinking its tiles.
- Moves chained as fast as possible are all taken, on both surfaces.
