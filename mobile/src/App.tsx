import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppStateProvider, useApp } from './state/AppState.tsx';
import { NavigationProvider, useNav, type TabId } from './navigation.tsx';
import { deviceStorage } from './services/storage.ts';
import type { KeyValueStorage } from './core/storage/repository.ts';
import { HomeScreen } from './screens/HomeScreen.tsx';
import { RecipesScreen } from './screens/RecipesScreen.tsx';
import { RecipeDetailScreen } from './screens/RecipeDetailScreen.tsx';
import { ShoppingListScreen } from './screens/ShoppingListScreen.tsx';
import { SavedScreen } from './screens/SavedScreen.tsx';
import { SettingsScreen } from './screens/SettingsScreen.tsx';
import { Icon, type IconName } from './ui/Icon.tsx';
import { LogoMark } from './ui/Logo.tsx';
import { TAB_BAR_HEIGHT } from './ui/Screen.tsx';
import { colors, radius, shadow, space } from './ui/theme.ts';

const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'kesfet', label: 'Keşfet', icon: 'compass' },
  { id: 'tarifler', label: 'Tarifler', icon: 'book' },
  { id: 'liste', label: 'Liste', icon: 'list' },
  { id: 'kaydedilenler', label: 'Kayıtlı', icon: 'heart' },
  { id: 'ayarlar', label: 'Ayarlar', icon: 'settings' },
];

function TabBar() {
  const { tab, setTab, stack } = useNav();
  const { list } = useApp();
  const insets = useSafeAreaInsets();
  if (stack.length > 0) return null;
  const listCount = list.items.filter((i) => !i.haveAtHome).length;
  return (
    <View
      accessibilityRole="tablist"
      style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom, flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line }, shadow.card]}
    >
      {TABS.map((t) => {
        const active = t.id === tab;
        return (
          <Pressable
            key={t.id}
            testID={`sekme-${t.id}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t.label}
            onPress={() => setTab(t.id)}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}
          >
            <View>
              <Icon name={active && t.id === 'kaydedilenler' ? 'heartFill' : t.icon} size={23} color={active ? colors.tomato : colors.inkMuted} strokeWidth={active ? 2.1 : 1.8} />
              {t.id === 'liste' && listCount > 0 ? (
                <View testID="liste-rozet" style={{ position: 'absolute', top: -5, right: -10, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.tomato, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                  <Text style={{ color: colors.white, fontSize: 11, fontWeight: '800' }}>{listCount}</Text>
                </View>
              ) : null}
            </View>
            <Text style={{ fontSize: 11, fontWeight: active ? '800' : '600', color: active ? colors.tomato : colors.inkMuted }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ToastView() {
  const { toast } = useApp();
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  const bg = toast.tone === 'error' ? colors.danger : toast.tone === 'info' ? colors.ink : colors.herb;
  return (
    <View style={{ pointerEvents: 'none', position: 'absolute', left: space.lg, right: space.lg, top: insets.top + space.sm, alignItems: 'center' }}>
      <View testID="bildirim" accessibilityLiveRegion="polite" style={[{ backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: space.lg, paddingVertical: space.md, flexDirection: 'row', alignItems: 'center', gap: 8 }, shadow.lifted]}>
        <Icon name={toast.tone === 'error' ? 'alert' : 'check'} size={18} color={colors.white} />
        <Text style={{ color: colors.white, fontWeight: '700', fontSize: 14 }}>{toast.message}</Text>
      </View>
    </View>
  );
}

function Shell() {
  const { ready } = useApp();
  const { tab, stack } = useNav();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, gap: space.lg }}>
        <LogoMark size={56} />
        <ActivityIndicator color={colors.tomato} />
      </View>
    );
  }
  const top = stack[stack.length - 1];
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {top?.name === 'recipe' ? (
        <RecipeDetailScreen key={`${top.id}-${stack.length}`} id={top.id} initialServings={top.servings} />
      ) : tab === 'kesfet' ? (
        <HomeScreen />
      ) : tab === 'tarifler' ? (
        <RecipesScreen />
      ) : tab === 'liste' ? (
        <ShoppingListScreen />
      ) : tab === 'kaydedilenler' ? (
        <SavedScreen />
      ) : (
        <SettingsScreen />
      )}
      <TabBar />
      <ToastView />
    </View>
  );
}

export default function App({ storage = deviceStorage }: { storage?: KeyValueStorage }) {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppStateProvider storage={storage}>
        <NavigationProvider>
          <Shell />
        </NavigationProvider>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
