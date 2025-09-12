import { useWindowDimensions, PixelRatio, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BASE_W = 390;
const BASE_H = 844;

export function useResponsive() {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const shortest = Math.min(width, height);
  const longest = Math.max(width, height);
  const isLandscape = width > height;

  const isTablet = shortest >= 768;
  const isLargeTablet = longest >= 1200;

  const scaleW = width / BASE_W;
  const scaleH = height / BASE_H;
  const scale = Math.max(0.85, Math.min(1.35, Math.min(scaleW, scaleH)));
  const rem = Math.max(14, Math.round(shortest / 28));

  const normalizeFont = (size) =>
    Math.round((size * scale) / Math.max(1, fontScale));

  const hairline = 1 / PixelRatio.get();

  const bp = {
    phone: !isTablet,
    tablet: isTablet,
    largeTablet: isLargeTablet,
    landscape: isLandscape,
    compact: shortest < 360,
    roomy: shortest >= 430,
  };

  return {
    width, height, insets, bp,
    scale, rem, hairline,
    font: normalizeFont,
    platform: Platform.OS,
  };
}
