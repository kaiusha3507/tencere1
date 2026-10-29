import { useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRecipe } from '../core/data/recipes/index.ts';
import { APPLIANCE_BY_ID } from '../core/data/appliances.ts';
import { ALLERGENS, DIETS, getIngredient } from '../core/data/ingredients.ts';
import { recipeAllergens, recipeDiets, safeSubstitutions } from '../core/diet.ts';
import { matchEquipment } from '../core/search.ts';
import { formatMinutes, formatTL } from '../core/text.ts';
import { formatQuantity, formatRecipeAmount } from '../core/units.ts';
import { useApp } from '../state/AppState.tsx';
import { usePriceLabel, useRecipeCosting } from '../state/hooks.ts';
import { useNav } from '../navigation.tsx';
import { Screen } from '../ui/Screen.tsx';
import { Badge, Banner, Button, Card, IconButton, SectionTitle, Stepper } from '../ui/components.tsx';
import { RecipeArt } from '../ui/RecipeArt.tsx';
import { Icon } from '../ui/Icon.tsx';
import { colors, radius, space, type } from '../ui/theme.ts';

export function RecipeDetailScreen({ id, initialServings }: { id: string; initialServings?: number }) {
  const recipe = getRecipe(id);
  const app = useApp();
  const nav = useNav();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [servings, setServings] = useState(initialServings ?? recipe?.servings ?? 2);
  const [adding, setAdding] = useState(false);
  const data = useRecipeCosting(recipe, servings);
  const price = usePriceLabel();

  if (!recipe || !data) {
    return (
      <Screen title="Tarif bulunamadı" onBack={nav.pop} hasTabBar={false}>
        <Text style={type.body}>Bu tarif artık mevcut değil.</Text>
      </Screen>
    );
  }
  const { costing, budget } = data;
  const isSaved = app.saved.some((s) => s.recipeId === recipe.id);
  const equipment = matchEquipment(recipe, app.criteria.appliances);
  const allergens = recipeAllergens(recipe);
  const diets = recipeDiets(recipe);
  const subs = safeSubstitutions(recipe, app.criteria.allergens, app.criteria.diets);
  const missingCount = costing.lines.filter((l) => !l.free && l.toBuy > 0).length;
  const artW = Math.min(width, 640);

  const addToList = async () => {
    setAdding(true);
    try {
      const r = await app.addRecipe(recipe, servings);
      const n = r.added.length + r.merged.length;
      if (n === 0) app.showToast('Eksik malzeme yok — hepsi evde görünüyor.', 'info');
      else app.showToast(`${n} malzeme listeye eklendi${r.merged.length ? ` (${r.merged.length} tanesi birleştirildi)` : ''}.`);
    } finally {
      setAdding(false);
    }
  };

  const togglePantry = (ingredientId: string, isHome: boolean) => {
    void app.setPantryItem(ingredientId, isHome ? null : {});
  };

  const statusTone = budget.status === 'within' ? 'herb' : budget.status === 'consumption_only' ? 'saffron' : budget.status === 'over' ? 'danger' : 'neutral';

  return (
    <Screen
      testID="ekran-tarif"
      hasTabBar={false}
      bleedTop
      header={
        <View style={{ marginHorizontal: -space.lg }}>
          <RecipeArt recipe={recipe} width={artW} height={Math.round(artW * 0.62) + insets.top} />
          <View style={{ position: 'absolute', top: insets.top + space.sm, left: space.lg }}>
            <IconButton icon="chevronLeft" label="Geri" onPress={nav.pop} testID="geri" />
          </View>
        </View>
      }
      footer={
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Button
            testID="tarif-kaydet"
            variant="secondary"
            icon={isSaved ? 'heartFill' : 'heart'}
            label={isSaved ? 'Kaydedildi' : 'Kaydet'}
            onPress={async () => {
              const now = await app.toggleSaved(recipe.id);
              app.showToast(now ? 'Tarif kaydedildi.' : 'Kaydedilenlerden çıkarıldı.', 'info');
            }}
          />
          <Button
            testID="listeye-ekle"
            style={{ flex: 1 }}
            icon="cart"
            label={missingCount ? `Listeye ekle (${missingCount})` : 'Hepsi evde'}
            onPress={addToList}
            loading={adding}
            disabled={missingCount === 0}
          />
        </View>
      }
    >
      <View style={{ gap: 6 }}>
        <Text style={type.h1} accessibilityRole="header">{recipe.title}</Text>
        <Text style={[type.body, { color: colors.inkSoft }]}>{recipe.description}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          <Badge icon="clock" label={`${formatMinutes(recipe.prepMinutes + recipe.cookMinutes)} (hazırlık ${recipe.prepMinutes} dk)`} />
          <Badge label={`Zorluk: ${recipe.difficulty}`} />
          {diets.filter((d) => d === 'vegan' || (d === 'vejetaryen' && !diets.includes('vegan'))).map((d) => (
            <Badge key={d} tone="herb" icon="leaf" label={DIETS.find((x) => x.id === d)!.name} />
          ))}
        </View>
      </View>

      {/* Porsiyon + maliyet özeti */}
      <Card style={{ gap: space.md }} testID="maliyet-karti">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={type.h3}>Porsiyon</Text>
            <Text style={type.small}>Tarif {recipe.servings} kişilik yazıldı</Text>
          </View>
          <Stepper testID="porsiyon" label="Porsiyon" value={servings} onChange={setServings} />
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Stat testID="kasa-tutari" label="Kasa tutarı" value={costing.complete ? formatTL(costing.purchaseCost) : '—'} hint="Alınacak paketler" strong />
          <Stat testID="tuketilen-pay" label="Tüketilen pay" value={costing.complete ? formatTL(costing.consumptionCost) : '—'} hint="Tarifte kullanılan" />
          <Stat testID="porsiyon-basi" label="Porsiyon başı" value={costing.complete ? formatTL(costing.costPerServing) : '—'} hint="Tüketilen / kişi" />
        </View>
        {app.criteria.budget ? (
          <Banner testID="butce-aciklama" tone={statusTone} icon={budget.status === 'within' ? 'check' : 'alert'} title={budget.headline}>
            <View style={{ gap: 2 }}>
              {budget.reasons.map((r) => (
                <Text key={r} style={{ fontSize: 13, lineHeight: 18, color: colors.ink }}>• {r}</Text>
              ))}
            </View>
          </Banner>
        ) : (
          <Text style={type.small}>Bütçe girmedin. Kasa tutarı, alman gereken paketlerin toplamıdır; tüketilen pay ise tarifte kullanılan miktarın değeri.</Text>
        )}
        <Text style={[type.small, { color: price.isDemo ? colors.saffron : colors.inkSoft }]}>{price.label}</Text>
      </Card>

      {/* Ekipman */}
      <Card style={{ gap: space.sm }}>
        <Text style={type.h3}>Gereken ekipman</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {recipe.appliances.length === 0 ? <Text style={type.small}>Pişirme gerekmez.</Text> : null}
          {recipe.appliances.map((a) => (
            <View key={a} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Icon name={a} size={18} />
              <Text style={{ fontWeight: '600', color: colors.ink }}>{APPLIANCE_BY_ID[a].name}</Text>
            </View>
          ))}
        </View>
        {equipment.via === 'alternative' && equipment.note ? (
          <Banner tone="herb" icon="swap" title={`${equipment.appliances.map((a) => APPLIANCE_BY_ID[a].name).join(' + ')} ile yapabilirsin`}>
            {equipment.note}
          </Banner>
        ) : null}
        {!equipment.ok ? <Banner tone="danger" icon="alert">Bu tarif için gereken ekipman seçili değil: {equipment.missing.map((a) => APPLIANCE_BY_ID[a].name).join(', ')}.</Banner> : null}
        {(recipe.alternatives ?? []).filter((a) => a.appliances.join() !== equipment.appliances.join()).map((alt) => (
          <Text key={alt.appliances.join()} style={type.small}>
            Alternatif ({alt.appliances.map((a) => APPLIANCE_BY_ID[a].short).join(' + ')}): {alt.note}
          </Text>
        ))}
      </Card>

      {/* Malzemeler */}
      <View style={{ gap: space.md }}>
        <SectionTitle title="Malzemeler" subtitle={`${servings} kişilik · dokunarak "evde var" işaretle`} />
        <Card style={{ paddingVertical: space.sm }} testID="malzeme-listesi">
          {costing.lines.map((l, idx) => {
            const isHome = l.pantry === 'full';
            return (
              <View key={l.ingredient.id} style={{ paddingVertical: space.md, borderTopWidth: idx ? 1 : 0, borderTopColor: colors.line, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  {l.free ? (
                    <View style={{ width: 26 }} />
                  ) : (
                    <Pressable
                      testID={`evde-${l.ingredient.id}`}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isHome }}
                      accessibilityLabel={`${l.ingredient.name} evde var`}
                      onPress={() => togglePantry(l.ingredient.id, isHome)}
                      hitSlop={8}
                      style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, borderColor: isHome ? colors.herb : colors.line, backgroundColor: isHome ? colors.herb : colors.surface, alignItems: 'center', justifyContent: 'center' }}
                    >
                      {isHome ? <Icon name="check" size={16} color={colors.white} strokeWidth={3} /> : null}
                    </Pressable>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[type.body, { fontWeight: '600', textDecorationLine: isHome ? 'line-through' : 'none', color: isHome ? colors.inkSoft : colors.ink }]}>{l.ingredient.name}</Text>
                    <Text style={type.small}>
                      {formatRecipeAmount(l.amount, l.unit)}
                      {l.baseQty !== null && l.unit !== l.baseUnit && !['g', 'kg', 'ml', 'l'].includes(l.unit) ? ` (≈ ${formatQuantity(l.baseQty, l.baseUnit)})` : ''}
                      {l.note ? ` · ${l.note}` : ''}
                    </Text>
                  </View>
                  <Text style={[type.body, { fontWeight: '700' }]}>
                    {l.free ? '—' : l.consumptionCost !== null ? formatTL(l.consumptionCost) : '?'}
                  </Text>
                </View>
                {!l.free ? (
                  <Text style={[type.small, { marginLeft: 26 + space.md }]}>
                    {isHome
                      ? 'Evde var · satın alınmayacak'
                      : l.purchase
                        ? `${l.pantry === 'partial' ? 'Kısmen evde · ' : ''}Alınacak: ${l.purchase.packs} × ${l.purchase.product.name} = ${formatTL(l.purchase.purchaseCost)}${l.purchase.leftover > 0 ? ` · ${formatQuantity(l.purchase.leftover, l.baseUnit)} artar` : ''}`
                        : l.conversionError ?? 'Bu malzeme için ürün/fiyat bulunamadı'}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </Card>
      </View>

      {subs.length ? (
        <Card style={{ gap: space.sm }}>
          <Text style={type.h3}>İkame önerileri</Text>
          {subs.map((s) => (
            <Text key={s.substituteId} style={type.body}>
              {getIngredient(s.ingredientId).name} → {getIngredient(s.substituteId).name}: <Text style={type.small}>{s.note}</Text>
            </Text>
          ))}
          <Text style={type.small}>Yalnızca alerji ve diyet seçimlerine uyan, editoryal olarak kontrol edilmiş ikameler gösterilir.</Text>
        </Card>
      ) : null}

      <Card style={{ gap: space.sm }}>
        <Text style={type.h3}>Alerjen ve diyet bilgisi</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {allergens.length === 0 ? <Badge tone="herb" label="Listelenen alerjenleri içermez" /> : null}
          {allergens.map((a) => (
            <Badge key={a} tone={app.criteria.allergens.includes(a) ? 'danger' : 'tomato'} icon="alert" label={`İçerir: ${ALLERGENS.find((x) => x.id === a)?.name ?? a}`} />
          ))}
        </View>
        <Text style={type.small}>Uygun olduğu diyetler: {diets.length ? diets.map((d) => DIETS.find((x) => x.id === d)!.name).join(', ') : '—'}. Etiketler malzemelerden otomatik türetilir; paketli ürünlerin etiketini her zaman kontrol edin.</Text>
      </Card>

      <View style={{ gap: space.md }}>
        <SectionTitle title="Hazırlanışı" />
        {recipe.steps.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.tomato, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.white, fontWeight: '800' }}>{i + 1}</Text>
            </View>
            <Text style={[type.body, { flex: 1, paddingTop: 4 }]}>{s}</Text>
          </View>
        ))}
      </View>

      <Text style={[type.small, { color: colors.inkMuted }]}>
        Tarif: Tencere editoryal tarifi · Besin değerleri: henüz doğrulanmadı, gösterilmiyor · Görsel: {recipe.image.attribution}
      </Text>
    </Screen>
  );
}

function Stat({ label, value, hint, strong, testID }: { label: string; value: string; hint: string; strong?: boolean; testID?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: strong ? colors.ink : colors.surfaceAlt, borderRadius: radius.md, padding: space.md, gap: 2 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: strong ? '#CFC5B5' : colors.inkMuted, letterSpacing: 0.3 }}>{label.toLocaleUpperCase('tr-TR')}</Text>
      <Text testID={testID} style={{ fontFamily: type.money.fontFamily, fontSize: 19, color: strong ? colors.white : colors.ink }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: strong ? '#CFC5B5' : colors.inkSoft }}>{hint}</Text>
    </View>
  );
}
