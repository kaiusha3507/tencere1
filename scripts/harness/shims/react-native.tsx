/**
 * TEST DÜZENEĞİ — YALNIZCA BU GELİŞTİRME ORTAMINDA KULLANILIR, UYGULAMAYA DAHİL DEĞİLDİR.
 *
 * React Native bileşenlerinin, uygulamanın kullandığı alt kümesini tarayıcı DOM'una
 * eşleyen küçük bir köprü. Amacı: mobil arayüz kodunu (ekranlar, durum yönetimi,
 * gezinme, düğmeler) gerçek bir tarayıcıda çalıştırıp Playwright ile uçtan uca
 * test etmek. Yerel (native) çizimin birebir kopyası değildir.
 */
import React, { createContext, useContext, useState } from 'react';

type AnyStyle = Record<string, unknown> | null | undefined | false | AnyStyle[];
export type StyleProp<T> = T | T[] | null | undefined | false | StyleProp<T>[];
export type ViewStyle = Record<string, unknown>;
export type TextStyle = Record<string, unknown>;

const UNITLESS = new Set(['flex', 'flexGrow', 'flexShrink', 'opacity', 'zIndex', 'fontWeight', 'aspectRatio']);

function flatten(style: unknown): Record<string, unknown> {
  if (!style) return {};
  if (Array.isArray(style)) return style.reduce<Record<string, unknown>>((acc, s) => ({ ...acc, ...flatten(s) }), {});
  return style as Record<string, unknown>;
}

function toCss(style: unknown): React.CSSProperties {
  const s = flatten(style);
  const css: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) {
    if (v === undefined) continue;
    switch (k) {
      case 'paddingHorizontal':
        css.paddingLeft = v; css.paddingRight = v; break;
      case 'paddingVertical':
        css.paddingTop = v; css.paddingBottom = v; break;
      case 'marginHorizontal':
        css.marginLeft = v; css.marginRight = v; break;
      case 'marginVertical':
        css.marginTop = v; css.marginBottom = v; break;
      case 'flex':
        if (typeof v === 'number' && v > 0) { css.flexGrow = v; css.flexShrink = 1; css.flexBasis = '0%'; }
        else css.flex = v;
        break;
      case 'textDecorationLine':
        css.textDecoration = v; break;
      case 'transform':
        css.transform = Array.isArray(v) ? v.map((t) => Object.entries(t as object).map(([fn, val]) => `${fn}(${typeof val === 'number' && fn.startsWith('translate') ? `${val}px` : val})`).join(' ')).join(' ') : v;
        break;
      case 'fontFamily':
        css.fontFamily = v === 'System' || v === 'sans-serif' ? 'system-ui, -apple-system, Segoe UI, sans-serif' : v === 'serif' ? 'Georgia, serif' : `${v}, Georgia, serif`;
        break;
      case 'shadowColor': case 'shadowOffset': case 'shadowOpacity': case 'shadowRadius': case 'elevation':
        break;
      default:
        css[k] = typeof v === 'number' && !UNITLESS.has(k) ? `${v}px` : v;
    }
  }
  if (Object.keys(css).some((k) => /^border(Top|Bottom|Left|Right)?Width$/.test(k))) css.borderStyle = 'solid';
  return css as React.CSSProperties;
}

const VIEW_BASE: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', position: 'relative', boxSizing: 'border-box', minWidth: 0, minHeight: 0, flexShrink: 0, borderWidth: 0, borderStyle: 'solid',
};

interface A11y {
  testID?: string;
  accessibilityLabel?: string;
  accessibilityRole?: string;
  accessibilityState?: { selected?: boolean; checked?: boolean; disabled?: boolean };
  accessibilityLiveRegion?: string;
}
function a11y(p: A11y) {
  const role = p.accessibilityRole === 'header' ? 'heading' : p.accessibilityRole === 'text' ? undefined : p.accessibilityRole;
  return {
    'data-testid': p.testID,
    'aria-label': p.accessibilityLabel,
    role,
    'aria-selected': p.accessibilityState?.selected,
    'aria-checked': p.accessibilityState?.checked,
    'aria-disabled': p.accessibilityState?.disabled,
    'aria-live': p.accessibilityLiveRegion as 'polite' | undefined,
  };
}

/** RN davranışı: <Text> dışında düz metin yasaktır; yerel uygulamada çökme sebebidir. */
function assertNoRawText(children: unknown, where: string) {
  React.Children.forEach(children as React.ReactNode, (c) => {
    if (typeof c === 'string' || typeof c === 'number') {
      throw new Error(`Text strings must be rendered within a <Text> component (${where}: "${String(c).slice(0, 30)}")`);
    }
  });
}

type ViewProps = A11y & { style?: AnyStyle | unknown; children?: React.ReactNode; pointerEvents?: string; [k: string]: unknown };

export function View({ style, children, pointerEvents, ...rest }: ViewProps) {
  const css = { ...VIEW_BASE, ...toCss(style) };
  if (pointerEvents) css.pointerEvents = pointerEvents as React.CSSProperties['pointerEvents'];
  assertNoRawText(children, 'View');
  return <div {...a11y(rest)} style={css}>{children}</div>;
}
export const KeyboardAvoidingView = View;

const InText = createContext(false);
export function Text({ style, children, numberOfLines, onPress, ...rest }: ViewProps & { numberOfLines?: number; onPress?: () => void }) {
  const nested = useContext(InText);
  const css: React.CSSProperties = { whiteSpace: 'pre-wrap', margin: 0, ...(nested ? {} : { display: 'block', fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif', fontSize: 14, color: '#000' }), ...toCss(style) };
  if (numberOfLines) Object.assign(css, { display: '-webkit-box', WebkitLineClamp: numberOfLines, WebkitBoxOrient: 'vertical', overflow: 'hidden' });
  if (onPress) css.cursor = 'pointer';
  return (
    <InText.Provider value>
      <span {...a11y(rest)} style={css} onClick={onPress}>{children}</span>
    </InText.Provider>
  );
}

export function ScrollView({ style, contentContainerStyle, children, horizontal, ...rest }: ViewProps & { contentContainerStyle?: unknown; horizontal?: boolean }) {
  assertNoRawText(children, 'ScrollView');
  return (
    <div {...a11y(rest)} style={{ ...VIEW_BASE, flexShrink: 1, ...(horizontal ? { overflowX: 'auto' } : { overflowY: 'auto', flex: 1 }), ...toCss(style) }}>
      <div style={{ ...VIEW_BASE, ...(horizontal ? { flexDirection: 'row', alignItems: 'center' } : {}), ...toCss(contentContainerStyle) }}>{children}</div>
    </div>
  );
}

export function Pressable({ style, children, onPress, disabled, ...rest }: ViewProps & { onPress?: () => void; disabled?: boolean; hitSlop?: unknown }) {
  const [pressed, setPressed] = useState(false);
  const resolved = typeof style === 'function' ? (style as (s: { pressed: boolean }) => unknown)({ pressed }) : style;
  const kids = typeof children === 'function' ? (children as (s: { pressed: boolean }) => React.ReactNode)({ pressed }) : children;
  assertNoRawText(kids, 'Pressable');
  return (
    <div
      {...a11y(rest)}
      role={(a11y(rest).role as string) ?? (onPress ? 'button' : undefined)}
      aria-disabled={disabled || undefined}
      tabIndex={onPress ? 0 : undefined}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled && onPress) onPress();
      }}
      style={{ ...VIEW_BASE, cursor: disabled ? 'default' : 'pointer', userSelect: 'none', ...toCss(resolved) }}
    >
      {kids}
    </div>
  );
}

export function TextInput({ style, value, onChangeText, placeholder, multiline, onSubmitEditing, keyboardType, ...rest }: ViewProps & {
  value?: string; onChangeText?: (t: string) => void; placeholder?: string; multiline?: boolean; onSubmitEditing?: () => void; keyboardType?: string; placeholderTextColor?: string;
}) {
  const props = {
    ...a11y(rest),
    value,
    placeholder,
    inputMode: keyboardType === 'decimal-pad' || keyboardType === 'numeric' ? ('decimal' as const) : keyboardType === 'url' ? ('url' as const) : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChangeText?.(e.target.value),
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !multiline) onSubmitEditing?.(); },
    style: { border: 'none', outline: 'none', background: 'transparent', font: 'inherit', fontFamily: 'system-ui, sans-serif', minWidth: 0, ...toCss(style) },
  };
  return multiline ? <textarea {...props} /> : <input {...props} />;
}

export function Modal({ visible, children }: { visible?: boolean; children?: React.ReactNode; transparent?: boolean; animationType?: string; onRequestClose?: () => void }) {
  if (!visible) return null;
  return <div style={{ ...VIEW_BASE, position: 'fixed', inset: 0, zIndex: 50, justifyContent: 'flex-end' }}>{children}</div>;
}

export function ActivityIndicator({ color }: { color?: string }) {
  return <div role="progressbar" aria-label="Yükleniyor" style={{ width: 18, height: 18, borderRadius: 9, border: `2px solid ${color ?? '#999'}`, borderTopColor: 'transparent' }} />;
}

export const Platform = { OS: 'ios' as const, select<T>(o: { ios?: T; android?: T; default?: T }): T | undefined { return o.ios ?? o.default; } };
export const StyleSheet = { create<T>(s: T): T { return s; }, flatten };

declare global {
  interface Window { __opened: string[]; __shared: string[]; __alerts: string[] }
}
window.__opened = [];
window.__shared = [];
window.__alerts = [];

export const Alert = {
  alert(title: string, message?: string, buttons?: { text: string; style?: string; onPress?: () => void }[]) {
    window.__alerts.push(title);
    const ok = window.confirm(`${title}\n${message ?? ''}`);
    const btn = ok ? buttons?.find((b) => b.style === 'destructive') ?? buttons?.[buttons.length - 1] : buttons?.find((b) => b.style === 'cancel');
    btn?.onPress?.();
  },
};
export const Share = { async share(c: { message: string }) { window.__shared.push(c.message); return { action: 'sharedAction' }; } };
export const Linking = { async openURL(url: string) { window.__opened.push(url); } };
export const BackHandler = { addEventListener(_e: string, _h: () => boolean) { return { remove() {} }; } };
export function useWindowDimensions() { return { width: window.innerWidth, height: window.innerHeight, scale: 1, fontScale: 1 }; }
