// theme/resolveTokens.ts
import { tokens as baseTokens } from "../tokens";

export type ResponsiveKnobs = {
  rem: number;
  scale: number;
  hairline: number;
  font: (px: number) => number;
  bp: {
    phone: boolean; tablet: boolean; largeTablet: boolean;
    landscape: boolean; compact: boolean; roomy: boolean;
  };
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const round = (n: number) => Math.round(n);
const BASE_REM = 16;

export function getResolvedTokens(r: ResponsiveKnobs) {
  const { rem, scale, hairline, font, bp } = r;

  // Spacing → follow typography density
  const spacing = Object.fromEntries(
    Object.entries(baseTokens.spacing).map(([k, px]) => [k, round((px as number) * (rem / BASE_REM))])
  ) as Record<string, number>;

  // Typography → rem + accessibility font()
  const fontSize = Object.fromEntries(
    Object.entries(baseTokens.fontSize).map(([k, px]) => [k, font((px as number) * (rem / BASE_REM))])
  ) as Record<string, number>;

  // Radii → keep fixed (common choice). Switch to rem scaling if you prefer.
  const radius = { ...baseTokens.radius };

  // Icons → chrome scaler (clamped) + minimum tap size
  const ICON_MIN_TAP = 20, ICON_SCALE_MIN = 0.85, ICON_SCALE_MAX = 1.35;
  const iconSize = Object.fromEntries(
    Object.entries(baseTokens.iconSize).map(([k, px]) => {
      const v = round((px as number) * clamp(scale, ICON_SCALE_MIN, ICON_SCALE_MAX));
      return [k, Math.max(v, ICON_MIN_TAP)];
    })
  ) as Record<string, number>;

  // Buttons / speech-bubble buttons → scale with a11y clamps
  const BTN_MIN = 44, BTN_MAX = bp.tablet ? 88 : 72;
  const button = Object.fromEntries(
    Object.entries(baseTokens.button).map(([k, px]) => {
      const v = round((px as number) * scale);
      return [k, clamp(v, BTN_MIN, BTN_MAX)];
    })
  ) as Record<string, number>;

  // Images / thumbnails → treat like chrome
  const IMG_MIN = 40, IMG_MAX = bp.tablet ? 320 : 240;
  const imageSize = Object.fromEntries(
    Object.entries(baseTokens.imageSize).map(([k, px]) => {
      const v = round((px as number) * clamp(scale, 0.85, 1.35));
      return [k, clamp(v, IMG_MIN, IMG_MAX)];
    })
  ) as Record<string, number>;

  // Bars → height from scale, inner padding from rem
  const BAR_MIN = 44, BAR_MAX = bp.tablet ? 72 : 64;
  const barHeight = Object.fromEntries(
    Object.entries(baseTokens.barHeight).map(([k, px]) => {
      const v = round((px as number) * scale);
      return [k, clamp(v, BAR_MIN, BAR_MAX)];
    })
  ) as Record<string, number>;

  const bar = {
    height: barHeight,
    padY: clamp(round(0.5 * rem), 6, 16),
    padX: clamp(round(0.75 * rem), 8, 20),
  };

  // Borders / hairlines
  const border = { hairline, thin: hairline, medium: hairline * 2 };

  // Canvas / modal → keep raw values only as a migration aid; prefer % of screen at call sites
  const canvasModal = baseTokens.canvasModal;

  return {
    spacing,
    fontSize,
    radius,
    iconSize,
    button,
    imageSize,
    bar,
    border,
    canvasModal, // legacy: prefer % sizing in components

    // expose knobs when needed
    _rem: rem, _scale: scale, _hairline: hairline, _bp: bp,
  };
}
export type ResolvedTokens = ReturnType<typeof getResolvedTokens>;
