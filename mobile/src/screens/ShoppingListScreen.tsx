import { useState } from 'react';
import { Alert, Linking, Modal, Pressable, Share, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SummaryLine } from '../core/shopping-list.ts';
import { startCheckout, type CheckoutOutcome } from '../core/retail/checkout.ts';
import { formatTL } from '../core/text.ts';
import { formatQuantity } from '../core/units.ts';
import { RECIPE_BY_ID } from '../core/data/recipes/index.ts';
import { useApp } from '../state/AppState.tsx';
import { useListSummary, usePriceLabel } from '../state/hooks.ts';
import { useNav } from '../navigation.tsx';
import { Screen } from '../ui/Screen.tsx';
import { Badge, Banner, Button, Card, EmptyState, IconButton, SectionTitle } from '../ui/components.tsx';
import { IngredientPicker } from '../ui/IngredientPicker.tsx';
import { Icon } from '../ui/Icon.tsx';
import { colors, radius, shadow, space, type } from '../ui/theme.ts';

function stepFor(unit: SummaryLine['ingredient']['baseUnit'], qty: number): number {
  if (unit === 'adet') return qty < 1 || qty % 1 !== 0 ? 0.5 : 1;
  return qty <= 100 ? 25 : 50;
}

export function ShoppingListScreen() {
  const app = useApp();
  const nav = useNav();
  const summary = useListSummary();
  const price = usePriceLabel();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutOutcome | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const onCheckout = async () => {
    setCheckingOut(true);
    try {
      setCheckout(await startCheckout(app.integration?.checkout ?? null, summary));
    } finally {
      setCheckingOut(false);
    }
  };

  const confirmClear = () =>
    Alert.alert('Listeyi temizle', 'Tüm ürünler listeden silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Temizle', style: 'destructive', onPress: () => void app.listAction({ type: 'clear' }) },
    ]);

  const recipeTitles = [...new Set(app.list.items.flatMap((i) => i.sources.map((s) => s.recipeId)))]
    .map((id) => RECIPE_BY_ID[id]?.title)
    .filter(Boolean);

  if (app.list.items.length === 0 && !adding) {
    return (
      <Screen testID="ekran-liste" title="Alışveriş listesi">
        <EmptyState
          icon="list"
          title="Listen boş"
          body="Bir tarif açıp “eksikleri listeye ekle” dediğinde, evde olmayan malzemeler burada birleşir; paket boyutu ve tahmini kasa tutarı hesaplanır."
          action={
            <View style={{ gap: 8, width: '100%' }}>
              <Button label="Tarif bul" icon="search" onPress={() => nav.setTab('kesfet')} testID="bos-tarif-bul" />
              <Button label="Elle malzeme ekle" variant="secondary" icon="plus" onPress={() => setAdding(true)} testID="elle-ekle-ac" />
            </View>
          }
        />
      </Screen>
    );
  }

  return (
    <Screen
      testID="ekran-liste"
      title="Alışveriş listesi"
      subtitle={recipeTitles.length ? recipeTitles.join(' · ') : undefined}
      right={app.list.items.length ? <IconButton icon="trash" label="Listeyi temizle" onPress={confirmClear} testID="liste-temizle" /> : null}
      footer={
        <Button testID="migros-devam" label="Migros'ta alışverişe devam et" icon="cart" onPress={onCheckout} loading={checkingOut} disabled={summary.toBuy.length === 0} />
      }
    >
      {/* Toplamlar */}
      <Card testID="liste-toplam" style={{ gap: space.md, backgroundColor: colors.ink, borderColor: colors.ink }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text style={{ color: '#CFC5B5', fontSize: 12, fontWeight: '700', letterSpacing: 0.4 }}>BEKLENEN KASA TUTARI</Text>
            <Text testID="kasa-toplam" style={{ fontFamily: type.hero.fontFamily, fontSize: 36, color: colors.white }}>{formatTL(summary.purchaseTotal)}</Text>
          </View>
          <Text style={{ color: '#CFC5B5', fontSize: 13 }}>{summary.toBuy.length} ürün</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: space.lg }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#CFC5B5', fontSize: 12 }}>Tariflerde kullanılacak</Text>
            <Text testID="tuketim-toplam" style={{ color: colors.white, fontSize: 17, fontWeight: '700' }}>{formatTL(summary.consumptionTotal)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#CFC5B5', fontSize: 12 }}>Paketlerden artacak</Text>
            <Text testID="artan-toplam" style={{ color: colors.white, fontSize: 17, fontWeight: '700' }}>{formatTL(summary.leftoverValue)}</Text>
          </View>
        </View>
        {!summary.complete ? <Text style={{ color: '#F4B860', fontSize: 13 }}>Fiyatı bilinmeyen: {summary.unpriced.join(', ')} (toplama dahil değil)</Text> : null}
        <Text style={{ color: price.isDemo ? '#F4B860' : '#CFC5B5', fontSize: 12 }}>{price.label}</Text>
      </Card>

      {/* Satın alınacaklar */}
      <View style={{ gap: space.md }}>
        <SectionTitle title="Alınacaklar" right={<Button small variant="ghost" icon="plus" label="Ekle" onPress={() => setAdding((v) => !v)} testID="elle-ekle-ac" />} />
        {adding ? (
          <Card style={{ gap: space.sm }}>
            <Text style={type.h3}>Listeye malzeme ekle</Text>
            <IngredientPicker
              testID="liste-ekle"
              selected={[]}
              onToggle={(id) => {
                const opts = app.integration?.offers[id] ?? [];
                const qty = opts.length ? Math.min(...opts.map((o) => o.packageSize)) : 1;
                void app.listAction({ type: 'manual', ingredientId: id, quantity: qty });
                app.showToast('Listeye eklendi.');
              }}
            />
            <Button small variant="secondary" label="Kapat" onPress={() => setAdding(false)} />
          </Card>
        ) : null}
        {summary.toBuy.map((line) => (
          <ListRow key={line.item.id} line={line} expanded={expanded === line.item.id} onToggleExpand={() => setExpanded((e) => (e === line.item.id ? null : line.item.id))} />
        ))}
      </View>

      {summary.atHome.length ? (
        <View style={{ gap: space.md }}>
          <SectionTitle title="Evde var" subtitle="Kasa tutarına dahil edilmez" />
          {summary.atHome.map((line) => (
            <Card key={line.item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md }}>
              <Icon name="check" color={colors.herb} />
              <Text style={[type.body, { flex: 1, color: colors.inkSoft, textDecorationLine: 'line-through' }]}>
                {line.ingredient.name} · {formatQuantity(line.item.quantity, line.ingredient.baseUnit)}
              </Text>
              <Button small variant="secondary" label="Geri al" onPress={() => void app.listAction({ type: 'have', itemId: line.item.id, have: false })} testID={`geri-al-${line.ingredient.id}`} />
            </Card>
          ))}
        </View>
      ) : null}

      <CheckoutSheet outcome={checkout} onClose={() => setCheckout(null)} />
    </Screen>
  );
}

function ListRow({ line, expanded, onToggleExpand }: { line: SummaryLine; expanded: boolean; onToggleExpand: () => void }) {
  const app = useApp();
  const { item, ingredient, choice, options } = line;
  const step = stepFor(ingredient.baseUnit, item.quantity);
  return (
    <Card testID={`liste-satir-${ingredient.id}`} style={{ gap: space.sm, paddingVertical: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={type.h3}>{ingredient.name}</Text>
          <Text style={type.small} numberOfLines={1}>
            {item.sources.length ? item.sources.map((s) => s.title).join(', ') : 'Elle eklendi'}
            {item.manual ? ' · düzenlendi' : ''}
          </Text>
        </View>
        <Text testID={`satir-tutar-${ingredient.id}`} style={type.money}>{choice ? formatTL(choice.purchaseCost) : '—'}</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <QtyButton icon="minus" label={`${ingredient.name} azalt`} testID={`azalt-${ingredient.id}`} onPress={() => void app.listAction({ type: 'quantity', itemId: item.id, quantity: Math.max(0, Math.round((item.quantity - step) * 100) / 100) })} />
          <Text testID={`miktar-${ingredient.id}`} style={{ fontSize: 15, fontWeight: '700', minWidth: 70, textAlign: 'center', color: colors.ink }}>
            {formatQuantity(item.quantity, ingredient.baseUnit)}
          </Text>
          <QtyButton icon="plus" label={`${ingredient.name} artır`} testID={`artir-${ingredient.id}`} onPress={() => void app.listAction({ type: 'quantity', itemId: item.id, quantity: Math.round((item.quantity + step) * 100) / 100 })} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconButton icon="check" label={`${ingredient.name} evde var`} testID={`evde-var-${ingredient.id}`} color={colors.herb} onPress={() => void app.listAction({ type: 'have', itemId: item.id, have: true, addToPantry: true })} />
          <IconButton icon="trash" label={`${ingredient.name} sil`} testID={`sil-${ingredient.id}`} color={colors.danger} onPress={() => void app.listAction({ type: 'remove', itemId: item.id })} />
        </View>
      </View>

      {choice ? (
        <Pressable testID={`paketler-${ingredient.id}`} accessibilityRole="button" onPress={onToggleExpand} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: space.sm }}>
          <Icon name="cart" size={16} color={colors.inkSoft} />
          <Text style={[type.small, { flex: 1 }]}>
            {choice.packs} × {choice.product.name}
            {choice.leftover > 0 ? ` · ${formatQuantity(choice.leftover, ingredient.baseUnit)} artar` : ''}
          </Text>
          {options.length > 1 ? <Text style={[type.small, { color: colors.tomato, fontWeight: '700' }]}>{expanded ? 'Kapat' : 'Paketleri karşılaştır'}</Text> : null}
        </Pressable>
      ) : (
        <Banner tone="neutral">Bu malzeme için ürün/fiyat bilgisi yok.</Banner>
      )}

      {expanded
        ? options.map((o) => {
            const selected = o.product.id === choice?.product.id;
            return (
              <Pressable
                key={o.product.id}
                testID={`paket-sec-${o.product.id}`}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => void app.listAction({ type: 'product', itemId: item.id, productId: o.product.id })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: selected ? colors.tomato : colors.line }}
              >
                <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: selected ? colors.tomato : colors.line, alignItems: 'center', justifyContent: 'center' }}>
                  {selected ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.tomato }} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { fontWeight: '600' }]}>{o.packs} × {o.product.name}</Text>
                  <Text style={type.small}>
                    Paket {formatTL(o.product.price)} · {ingredient.baseUnit === 'adet' ? `${formatTL(o.unitPrice)}/adet` : `${formatTL(o.unitPrice * 1000)}/${ingredient.baseUnit === 'g' ? 'kg' : 'L'}`}
                    {o.leftover > 0 ? ` · ${formatQuantity(o.leftover, ingredient.baseUnit)} artar` : ''}
                  </Text>
                </View>
                <Text style={[type.body, { fontWeight: '700' }]}>{formatTL(o.purchaseCost)}</Text>
              </Pressable>
            );
          })
        : null}
      {choice?.product.dataSource === 'demo' ? <Badge label="Örnek ürün ve fiyat" tone="saffron" /> : null}
    </Card>
  );
}

function QtyButton({ icon, onPress, label, testID }: { icon: 'plus' | 'minus'; onPress: () => void; label: string; testID: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={({ pressed }) => ({ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
      <Icon name={icon} size={16} />
    </Pressable>
  );
}

/** "Migros'ta alışverişe devam et" sonucunu, entegrasyonun gerçek durumuna göre gösterir. */
function CheckoutSheet({ outcome, onClose }: { outcome: CheckoutOutcome | null; onClose: () => void }) {
  const app = useApp();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  if (!outcome) return null;
  const text = outcome.kind === 'cart_created' ? '' : outcome.text;
  const storefront = outcome.kind === 'cart_created' ? outcome.result.checkoutUrl : outcome.storefrontUrl;

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(text);
      // Modal açıkken uygulama bildirimi görünmez; geri bildirimi düğmenin kendisinde göster.
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const share = async () => {
    try {
      await Share.share({ message: text, title: 'Tencere alışveriş listesi' });
    } catch {
      app.showToast('Paylaşım açılamadı.', 'error');
    }
  };
  const openStore = async () => {
    if (!storefront) return;
    try {
      await Linking.openURL(storefront);
    } catch {
      app.showToast('Bağlantı açılamadı.', 'error');
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => { setCopied(false); onClose(); }}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(31,27,22,0.45)' }} onPress={onClose} accessibilityLabel="Kapat" />
      <View testID="odeme-paneli" style={[{ backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.xl, paddingBottom: insets.bottom + space.xl, gap: space.lg }, shadow.lifted]}>
        <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line }} />
        {outcome.kind === 'cart_created' ? (
          <>
            <Banner tone="herb" icon="check" title="Migros sepetin hazır">
              {`${outcome.result.lineCount} ürün Migros sepetine eklendi (sepet no: ${outcome.result.cartId}).`}
            </Banner>
            {storefront ? <Button label="Sepete git" icon="external" onPress={openStore} /> : null}
          </>
        ) : (
          <>
            <View style={{ gap: 6 }}>
              <Text style={type.h2}>{outcome.kind === 'cart_failed' ? 'Sepet oluşturulamadı' : 'Migros\'ta alışverişe devam et'}</Text>
              <Text testID="odeme-aciklama" style={type.small}>{outcome.kind === 'cart_failed' ? `Hata: ${outcome.error}. Hiçbir ürün Migros sepetine eklenmedi.` : outcome.reason}</Text>
            </View>
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space.md, maxHeight: 220 }}>
              <Text testID="odeme-liste-metni" style={{ fontSize: 13, lineHeight: 19, color: colors.ink }} numberOfLines={12}>{text}</Text>
            </View>
            <View style={{ gap: space.sm }}>
              <Button testID="liste-kopyala" label={copied ? 'Kopyalandı ✓' : 'Listeyi kopyala'} icon={copied ? 'check' : 'copy'} variant={copied ? 'herb' : 'primary'} onPress={copy} />
              <Button testID="liste-paylas" label="Paylaş" icon="share" variant="secondary" onPress={share} />
              {storefront ? (
                <>
                  <Button testID="migros-ac" label="Migros'u aç" icon="external" variant="secondary" onPress={openStore} />
                  <Text style={[type.small, { textAlign: 'center' }]}>Migros'un resmi sitesinin ana sayfası açılır; ürünleri orada arayıp sepetine kendin eklersin.</Text>
                </>
              ) : null}
            </View>
          </>
        )}
        <Button label="Kapat" variant="ghost" onPress={() => { setCopied(false); onClose(); }} testID="odeme-kapat" />
      </View>
    </Modal>
  );
}
