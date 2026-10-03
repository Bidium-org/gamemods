type SoftPalette = {
  empty: string;
  tiles: Record<number, string>;
  super: string;
  darkDigit: string;
  lightDigit: string;
};

export const PALETTE: SoftPalette = {
  empty: "#bbad9a",
  tiles: {
    2: "#ede5dd",
    4: "#e8d9b9",
    8: "#edbb8e",
    16: "#e8956a",
    32: "#e37e60",
    64: "#d66850",
    128: "#ebcb7e",
    256: "#e4b862",
    512: "#dca24c",
    1024: "#c98545",
    2048: "#b5683d",
  },
  super: "#6b5d4f",
  darkDigit: "#6b5d4f",
  lightDigit: "#ffffff",
};

const DIGIT_THRESHOLD = 0.75;

const channels = (hex: string): number[] =>
  [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));

const brightness = (hex: string): number => {
  const [red = 0, green = 0, blue = 0] = channels(hex);
  return (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
};

export const tileFill = (value: number): string => PALETTE.tiles[value] ?? PALETTE.super;

export const digitColor = (fill: string): string =>
  brightness(fill) > DIGIT_THRESHOLD ? PALETTE.darkDigit : PALETTE.lightDigit;
