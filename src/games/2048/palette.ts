type SoftPalette = {
  board: string;
  empty: string;
  shadow: string;
  gain: string;
  veil: string;
  tiles: Record<number, string>;
  super: string;
  darkDigit: string;
  lightDigit: string;
};

export const PALETTE: SoftPalette = {
  board: "#998b7d",
  empty: "#bbad9a",
  shadow: "#5c4b3a",
  gain: "#e8956a",
  veil: "#000000",
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
const VIVIDNESS = 2;

const channels = (hex: string): number[] =>
  [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));

const toHex = (values: number[]): string =>
  `#${values
    .map((value) =>
      Math.round(Math.min(Math.max(value, 0), 255))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

const brightness = (hex: string): number => {
  const [red = 0, green = 0, blue = 0] = channels(hex);
  return (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
};

export const tileFill = (value: number): string => PALETTE.tiles[value] ?? PALETTE.super;

export const digitColor = (fill: string): string =>
  brightness(fill) > DIGIT_THRESHOLD ? PALETTE.darkDigit : PALETTE.lightDigit;

export const mix = (from: string, to: string, progress: number): string => {
  const target = channels(to);
  return toHex(channels(from).map((value, i) => value + ((target[i] ?? value) - value) * progress));
};

export const vivid = (hex: string): string => {
  const values = channels(hex);
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  return toHex(values.map((value) => mean + (value - mean) * VIVIDNESS));
};
