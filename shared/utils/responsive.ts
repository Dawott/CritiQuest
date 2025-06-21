import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

//Do zmiany jak coś
const baseWidth = 390;
const baseHeight = 844;

export const wp = (widthPercent: number): number => {
  const elemWidth = typeof widthPercent === 'number' ? widthPercent : parseFloat(widthPercent);
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * elemWidth) / 100);
};

export const hp = (heightPercent: number): number => {
  const elemHeight = typeof heightPercent === 'number' ? heightPercent : parseFloat(heightPercent);
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * elemHeight) / 100);
};

export const scale = (size: number): number => {
  return (SCREEN_WIDTH / baseWidth) * size;
};

export const verticalScale = (size: number): number => {
  return (SCREEN_HEIGHT / baseHeight) * size;
};

export const moderateScale = (size: number, factor = 0.5): number => {
  return size + (scale(size) - size) * factor;
};

export const isSmallDevice = SCREEN_WIDTH < 375;
export const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
export const isLargeDevice = SCREEN_WIDTH >= 414;

export const responsive = {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  wp,
  hp,
  scale,
  verticalScale,
  moderateScale,
  isSmallDevice,
  isMediumDevice,
  isLargeDevice,
};