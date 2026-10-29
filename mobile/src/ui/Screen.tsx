import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space, type } from './theme.ts';
import { IconButton } from './components.tsx';

export const TAB_BAR_HEIGHT = 64;

/** Ortak ekran iskeleti: güvenli alan, kaydırma ve isteğe bağlı başlık/alt eylem çubuğu. */
export function Screen({
  title,
  subtitle,
  onBack,
  right,
  children,
  footer,
  header,
  testID,
  hasTabBar = true,
  bleedTop = false,
}: {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  header?: React.ReactNode;
  testID?: string;
  hasTabBar?: boolean;
  /** Başlık görseli ekranın en üstüne kadar uzansın (güvenli alan boşluğu eklenmez). */
  bleedTop?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const bottomPad = (hasTabBar ? TAB_BAR_HEIGHT + insets.bottom : insets.bottom) + space.lg;
  return (
    <KeyboardAvoidingView testID={testID} style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: bleedTop ? 0 : insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: bottomPad + (footer ? 84 : 0), gap: space.lg }}
        keyboardShouldPersistTaps="handled"
      >
        {header}
        {title || onBack ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            {onBack ? <IconButton icon="chevronLeft" label="Geri" onPress={onBack} testID="geri" /> : null}
            <View style={{ flex: 1 }}>
              {title ? <Text style={type.h1} accessibilityRole="header">{title}</Text> : null}
              {subtitle ? <Text style={type.small}>{subtitle}</Text> : null}
            </View>
            {right}
          </View>
        ) : null}
        {children}
      </ScrollView>
      {footer ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: hasTabBar ? TAB_BAR_HEIGHT + insets.bottom : 0,
            paddingHorizontal: space.lg,
            paddingTop: space.md,
            paddingBottom: hasTabBar ? space.md : insets.bottom + space.md,
            backgroundColor: 'rgba(251,246,238,0.96)',
            borderTopWidth: 1,
            borderTopColor: colors.line,
          }}
        >
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
