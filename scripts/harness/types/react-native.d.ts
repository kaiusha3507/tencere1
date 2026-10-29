// React Native API'sinin uygulamada kullanılan alt kümesi (gerçek RN adları ve tipleriyle).
declare module 'react-native' {
  import type { ReactNode, ReactElement } from 'react';
  type DimensionValue = number | `${number}%` | 'auto';
  type ColorValue = string;
  export interface ViewStyle {
    flex?: number; flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse'; flexWrap?: 'wrap' | 'nowrap';
    flexGrow?: number; flexShrink?: number; flexBasis?: DimensionValue;
    alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
    alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
    justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
    gap?: number; rowGap?: number; columnGap?: number;
    width?: DimensionValue; height?: DimensionValue; minWidth?: DimensionValue; minHeight?: DimensionValue; maxWidth?: DimensionValue; maxHeight?: DimensionValue;
    padding?: DimensionValue; paddingHorizontal?: DimensionValue; paddingVertical?: DimensionValue; paddingTop?: DimensionValue; paddingBottom?: DimensionValue; paddingLeft?: DimensionValue; paddingRight?: DimensionValue;
    margin?: DimensionValue; marginHorizontal?: DimensionValue; marginVertical?: DimensionValue; marginTop?: DimensionValue; marginBottom?: DimensionValue; marginLeft?: DimensionValue; marginRight?: DimensionValue;
    position?: 'absolute' | 'relative'; top?: DimensionValue; bottom?: DimensionValue; left?: DimensionValue; right?: DimensionValue; zIndex?: number;
    backgroundColor?: ColorValue; opacity?: number; overflow?: 'visible' | 'hidden' | 'scroll';
    borderWidth?: number; borderTopWidth?: number; borderBottomWidth?: number; borderColor?: ColorValue; borderTopColor?: ColorValue;
    borderRadius?: number; borderTopLeftRadius?: number; borderTopRightRadius?: number;
    transform?: ({ scale: number } | { translateY: number } | { translateX: number } | { rotate: string })[];
    boxShadow?: string; pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only'; aspectRatio?: number;
  }
  export interface TextStyle extends ViewStyle {
    color?: ColorValue; fontSize?: number; fontWeight?: '400' | '500' | '600' | '700' | '800' | '900' | 'normal' | 'bold';
    fontFamily?: string; lineHeight?: number; letterSpacing?: number; textAlign?: 'left' | 'right' | 'center' | 'auto';
    textDecorationLine?: 'none' | 'underline' | 'line-through'; fontStyle?: 'normal' | 'italic';
  }
  export type StyleProp<T> = T | readonly StyleProp<T>[] | null | undefined | false;
  interface AccessibilityProps {
    testID?: string; accessibilityLabel?: string;
    accessibilityRole?: 'button' | 'link' | 'header' | 'text' | 'checkbox' | 'switch' | 'radio' | 'tab' | 'tablist' | 'image' | 'search' | 'none';
    accessibilityState?: { selected?: boolean; checked?: boolean; disabled?: boolean; expanded?: boolean };
    accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
  }
  export interface ViewProps extends AccessibilityProps { style?: StyleProp<ViewStyle>; children?: ReactNode }
  export function View(props: ViewProps): ReactElement;
  export function KeyboardAvoidingView(props: ViewProps & { behavior?: 'padding' | 'height' | 'position' }): ReactElement;
  export interface TextProps extends AccessibilityProps { style?: StyleProp<TextStyle>; children?: ReactNode; numberOfLines?: number; onPress?: () => void; adjustsFontSizeToFit?: boolean }
  export function Text(props: TextProps): ReactElement;
  export interface PressableProps extends AccessibilityProps {
    style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
    children?: ReactNode; onPress?: () => void; disabled?: boolean; hitSlop?: number;
  }
  export function Pressable(props: PressableProps): ReactElement;
  export interface ScrollViewProps extends ViewProps { contentContainerStyle?: StyleProp<ViewStyle>; horizontal?: boolean; showsHorizontalScrollIndicator?: boolean; keyboardShouldPersistTaps?: 'always' | 'never' | 'handled' }
  export function ScrollView(props: ScrollViewProps): ReactElement;
  export interface TextInputProps extends AccessibilityProps {
    style?: StyleProp<TextStyle>; value?: string; onChangeText?: (t: string) => void; placeholder?: string; placeholderTextColor?: ColorValue;
    keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'url' | 'email-address'; autoCapitalize?: 'none' | 'sentences' | 'words';
    multiline?: boolean; onSubmitEditing?: () => void; returnKeyType?: 'done' | 'search' | 'go' | 'next';
  }
  export function TextInput(props: TextInputProps): ReactElement;
  export function Modal(props: { visible?: boolean; transparent?: boolean; animationType?: 'none' | 'slide' | 'fade'; onRequestClose?: () => void; children?: ReactNode }): ReactElement;
  export function ActivityIndicator(props: { color?: ColorValue; size?: 'small' | 'large' }): ReactElement;
  export const Platform: { OS: 'ios' | 'android' | 'web'; select<T>(spec: { ios?: T; android?: T; default?: T }): T };
  export const Alert: { alert(title: string, message?: string, buttons?: { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }[]): void };
  export const Share: { share(content: { message: string; title?: string }): Promise<{ action: string }> };
  export const Linking: { openURL(url: string): Promise<unknown> };
  export const BackHandler: { addEventListener(event: 'hardwareBackPress', handler: () => boolean | null | undefined): { remove(): void } };
  export function useWindowDimensions(): { width: number; height: number; scale: number; fontScale: number };
}
declare module 'react-native-svg' {
  import type { ReactElement, ReactNode } from 'react';
  interface Common { fill?: string; stroke?: string; strokeWidth?: number; strokeLinecap?: 'round' | 'butt' | 'square'; strokeLinejoin?: 'round' | 'miter' | 'bevel'; opacity?: number; transform?: string; children?: ReactNode }
  export default function Svg(props: { width: number; height: number; viewBox: string; children?: ReactNode }): ReactElement;
  export function Circle(props: Common & { cx: number; cy: number; r: number }): ReactElement;
  export function Ellipse(props: Common & { cx: number; cy: number; rx: number; ry: number }): ReactElement;
  export function Rect(props: Common & { x: number; y: number; width: number; height: number; rx?: number }): ReactElement;
  export function Line(props: Common & { x1: number; y1: number; x2: number; y2: number }): ReactElement;
  export function Path(props: Common & { d: string }): ReactElement;
  export function G(props: Common): ReactElement;
}
declare module 'react-native-safe-area-context' {
  import type { ReactElement, ReactNode } from 'react';
  export function SafeAreaProvider(props: { children?: ReactNode }): ReactElement;
  export function useSafeAreaInsets(): { top: number; bottom: number; left: number; right: number };
}
declare module 'expo-status-bar' {
  export function StatusBar(props: { style?: 'auto' | 'light' | 'dark' }): null;
}
declare module 'expo-clipboard' {
  export function setStringAsync(text: string): Promise<boolean>;
}
declare module 'expo-sqlite/kv-store' {
  const Storage: { getItem(k: string): Promise<string | null>; setItem(k: string, v: string): Promise<void>; removeItem(k: string): Promise<void> };
  export default Storage;
}
declare module 'expo' {
  export function registerRootComponent(component: (props: never) => unknown): void;
}
declare const process: { env: Record<string, string | undefined> };
