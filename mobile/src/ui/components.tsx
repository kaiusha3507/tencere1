import React from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadow, space, type } from './theme.ts';
import { Icon, type IconName } from './Icon.tsx';

export function Card({ children, style, testID }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  return (
    <View testID={testID} style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: colors.line }, shadow.card, style]}>
      {children}
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'herb';

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  testID,
  style,
  small,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
  accessibilityLabel?: string;
}) {
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.tomato, fg: colors.white, border: colors.tomato },
    herb: { bg: colors.herb, fg: colors.white, border: colors.herb },
    secondary: { bg: colors.surface, fg: colors.ink, border: colors.line },
    ghost: { bg: 'transparent', fg: colors.tomato, border: 'transparent' },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
  };
  const c = palette[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!inactive }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.sm,
          minHeight: small ? 38 : 50,
          paddingHorizontal: small ? space.md : space.xl,
          borderRadius: radius.pill,
          backgroundColor: c.bg,
          borderWidth: 1,
          borderColor: c.border,
          opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !inactive ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={c.fg} /> : icon ? <Icon name={icon} size={small ? 18 : 20} color={c.fg} /> : null}
      <Text style={{ color: c.fg, fontSize: small ? 14 : 16, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, testID, color = colors.ink, bg = colors.surface }: { icon: IconName; onPress: () => void; label: string; testID?: string; color?: string; bg?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: bg, borderWidth: 1, borderColor: colors.line, opacity: pressed ? 0.7 : 1 })}
    >
      <Icon name={icon} size={20} color={color} />
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, icon, testID, tone = 'tomato' }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName; testID?: string; tone?: 'tomato' | 'herb' | 'danger' }) {
  const toneColor = tone === 'herb' ? colors.herb : tone === 'danger' ? colors.danger : colors.ink;
  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        minHeight: 36,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: selected ? toneColor : colors.line,
        backgroundColor: selected ? toneColor : colors.surface,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {icon ? <Icon name={icon} size={16} color={selected ? colors.white : colors.inkSoft} /> : null}
      <Text style={{ fontSize: 14, fontWeight: '600', color: selected ? colors.white : colors.ink }}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: 'neutral' | 'herb' | 'tomato' | 'saffron' | 'danger'; icon?: IconName }) {
  const map = {
    neutral: [colors.surfaceAlt, colors.inkSoft],
    herb: [colors.herbSoft, colors.herb],
    tomato: [colors.tomatoSoft, colors.tomatoDark],
    saffron: [colors.saffronSoft, colors.saffron],
    danger: [colors.dangerSoft, colors.danger],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill }}>
      {icon ? <Icon name={icon} size={12} color={fg} strokeWidth={2.2} /> : null}
      <Text style={{ fontSize: 12, fontWeight: '700', color: fg }}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: space.md, gap: space.md }}>
      <View style={{ flex: 1 }}>
        <Text style={type.h2}>{title}</Text>
        {subtitle ? <Text style={[type.small, { marginTop: 2 }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Banner({ tone = 'saffron', icon = 'info', title, children, testID }: { tone?: 'saffron' | 'herb' | 'danger' | 'neutral'; icon?: IconName; title?: string; children?: React.ReactNode; testID?: string }) {
  const map = {
    saffron: [colors.saffronSoft, colors.saffron],
    herb: [colors.herbSoft, colors.herb],
    danger: [colors.dangerSoft, colors.danger],
    neutral: [colors.surfaceAlt, colors.inkSoft],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View testID={testID} style={{ flexDirection: 'row', gap: space.sm, backgroundColor: bg, padding: space.md, borderRadius: radius.md }}>
      <Icon name={icon} size={18} color={fg} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? <Text style={{ fontWeight: '700', color: fg, fontSize: 14 }}>{title}</Text> : null}
        {typeof children === 'string' ? <Text style={{ color: colors.ink, fontSize: 13, lineHeight: 18 }}>{children}</Text> : children}
      </View>
    </View>
  );
}

export function Stepper({ value, onChange, min = 1, max = 20, label, testID }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string; testID?: string }) {
  const btn = (icon: IconName, next: number, name: string) => (
    <Pressable
      testID={testID ? `${testID}-${name}` : undefined}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${name === 'artir' ? 'artır' : 'azalt'}`}
      disabled={next < min || next > max}
      onPress={() => onChange(next)}
      style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, opacity: next < min || next > max ? 0.35 : pressed ? 0.7 : 1 })}
    >
      <Icon name={icon} size={18} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }} accessibilityLabel={label}>
      {btn('minus', value - 1, 'azalt')}
      <Text testID={testID ? `${testID}-value` : undefined} style={{ fontSize: 20, fontWeight: '700', minWidth: 28, textAlign: 'center', color: colors.ink }}>
        {value}
      </Text>
      {btn('plus', value + 1, 'artir')}
    </View>
  );
}

export function Segmented<T extends string>({ options, value, onChange, testID }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; testID?: string }) {
  return (
    <View testID={testID} style={{ flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 4 }}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <Pressable
            key={o.id}
            testID={testID ? `${testID}-${o.id}` : undefined}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.id)}
            style={{ flex: 1, minHeight: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? colors.surface : 'transparent', ...(active ? shadow.card : {}) }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: active ? colors.ink : colors.inkSoft }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ToggleRow({ label, hint, value, onChange, testID }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm }}
    >
      <View style={{ flex: 1 }}>
        <Text style={type.body}>{label}</Text>
        {hint ? <Text style={type.small}>{hint}</Text> : null}
      </View>
      <View style={{ width: 48, height: 28, borderRadius: 14, backgroundColor: value ? colors.herb : colors.line, padding: 3, alignItems: value ? 'flex-end' : 'flex-start' }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white }} />
      </View>
    </Pressable>
  );
}

export function Field({ label, value, onChangeText, placeholder, keyboardType, testID, prefix, multiline }: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'url';
  testID?: string;
  prefix?: string;
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={type.tiny}>{label.toLocaleUpperCase('tr-TR')}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: space.md }}>
        {prefix ? <Text style={{ fontSize: 16, color: colors.inkSoft, marginRight: 4 }}>{prefix}</Text> : null}
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inkMuted}
          keyboardType={keyboardType}
          autoCapitalize="none"
          multiline={multiline}
          accessibilityLabel={label ?? placeholder}
          style={{ flex: 1, minHeight: 46, fontSize: 16, color: colors.ink, paddingVertical: 10 }}
        />
      </View>
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body: string; action?: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: space.xxxl, paddingHorizontal: space.xl, gap: space.md }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={28} color={colors.inkSoft} />
      </View>
      <Text style={[type.h2, { textAlign: 'center' }]}>{title}</Text>
      <Text style={[type.small, { textAlign: 'center', maxWidth: 320 }]}>{body}</Text>
      {action}
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.line, marginVertical: space.md }} />;
}

export function Meter({ value, testID }: { value: number; testID?: string }) {
  const pct = Math.max(0, Math.min(1, value));
  const color = value > 1 ? colors.danger : value > 0.9 ? colors.saffron : colors.herb;
  return (
    <View testID={testID} style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: 6, backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}
