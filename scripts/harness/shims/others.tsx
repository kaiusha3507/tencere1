/* TEST DÜZENEĞİ: react-native-svg, safe-area, expo modülleri için tarayıcı karşılıkları. */
import React, { createElement } from 'react';

type P = Record<string, unknown> & { children?: React.ReactNode };
const el = (tag: string) => (props: P) => createElement(tag, props);

export function Svg({ children, ...p }: P) {
  return createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', style: { display: 'block', flexShrink: 0 }, ...p }, children);
}
export const Circle = el('circle');
export const Ellipse = el('ellipse');
export const Path = el('path');
export const Rect = el('rect');
export const Line = el('line');
export const G = el('g');

// iPhone 14 benzeri güvenli alan
const INSETS = { top: 47, bottom: 34, left: 0, right: 0 };
export function SafeAreaProvider({ children }: P) {
  return createElement('div', { style: { position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column' } }, children);
}
export function useSafeAreaInsets() {
  return INSETS;
}

export function StatusBar() {
  return null;
}

declare global {
  interface Window { __clipboard: string }
}
export async function setStringAsync(text: string) {
  window.__clipboard = text;
  return true;
}

/** expo-sqlite/kv-store karşılığı: tarayıcıda localStorage (sayfa yenilenince veri kalır). */
export const KV = {
  async getItem(k: string) { return localStorage.getItem(k); },
  async setItem(k: string, v: string) { localStorage.setItem(k, v); },
  async removeItem(k: string) { localStorage.removeItem(k); },
};
