import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { CATEGORIES, SORTS } from '../core/search.ts';
import type { AiRecommendation } from '../core/ai/guard.ts';
import { APPLIANCE_BY_ID } from '../core/data/appliances.ts';
import { formatTL } from '../core/text.ts';
import { useApp } from '../state/AppState.tsx';
import { usePriceLabel, useSearch } from '../state/hooks.ts';
import { useNav } from '../navigation.tsx';
import { Screen } from '../ui/Screen.tsx';
import { Banner, Button, Card, Chip, EmptyState, SectionTitle } from '../ui/components.tsx';
import { RecipeCard } from '../ui/RecipeCard.tsx';
import { Icon } from '../ui/Icon.tsx';
import { colors, space, type } from '../ui/theme.ts';

export function RecipesScreen() {
  const app = useApp();
  const { criteria, setCriteria } = app;
  const nav = useNav();
  const out = useSearch();
  const price = usePriceLabel();
  const [picks, setPicks] = useState<{ items: AiRecommendation[]; usedAi: boolean } | null>(null);
  const [showSort, setShowSort] = useState(false);

  // Öne çıkanlar: AI varsa sıralama ve gerekçe, yoksa motorun kendi seçimi.
  useEffect(() => {
    let alive = true;
    if (out.results.length === 0) {
      setPicks(null);
      return;
    }
    app.assistant.recommend(app.request, criteria, out.results).then((r) => {
      if (alive) setPicks({ items: r.picks, usedAi: r.usedAi });
    });
    return () => {
      alive = false;
    };
  }, [out.results, app.assistant]);

  const summary = [
    criteria.budget ? formatTL(criteria.budget, { round: true }) : 'Bütçe yok',
    `${criteria.servings} kişi`,
    criteria.appliances.length ? criteria.appliances.map((a) => APPLIANCE_BY_ID[a].short).join(', ') : 'Tüm ekipmanlar',
    criteria.maxMinutes ? `≤ ${criteria.maxMinutes} dk` : null,
  ].filter(Boolean);

  const ex = out.excluded;
  const reasons: string[] = [];
  if (ex.equipment) reasons.push(`${ex.equipment} tarif seçmediğin ekipmanı gerektiriyor`);
  if (ex.budget) reasons.push(`${ex.budget} tarif bütçeyi aşıyor`);
  if (ex.unpriced) reasons.push(`${ex.unpriced} tarifin fiyatı doğrulanamadı`);
  if (ex.allergen) reasons.push(`${ex.allergen} tarif seçtiğin alerjeni içeriyor`);
  if (ex.diet) reasons.push(`${ex.diet} tarif diyetine uymuyor`);
  if (ex.excludedIngredient) reasons.push(`${ex.excludedIngredient} tarif istemediğin malzemeyi içeriyor`);
  if (ex.time) reasons.push(`${ex.time} tarif süreyi aşıyor`);

  const open = (id: string) => nav.push({ name: 'recipe', id, servings: criteria.servings });
  const pickResults = (picks?.items ?? []).map((p) => ({ p, r: out.results.find((x) => x.recipe.id === p.recipeId)! })).filter((x) => x.r);

  return (
    <Screen testID="ekran-tarifler" title="Tarifler" subtitle={summary.join(' · ')} right={<Button small variant="secondary" icon="edit" label="Düzenle" onPress={() => nav.setTab('kesfet')} testID="kriter-duzenle" />}>
      {price.isDemo ? (
        <Banner testID="demo-fiyat-uyari" title="Örnek fiyatlar">
          Tutarlar hesaplamayı göstermek için temsili örnek fiyatlarla yapılır; gerçek Migros fiyatı değildir.
        </Banner>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -space.lg }}>
        <View style={{ width: space.lg - 8 }} />
        <Chip testID="kategori-tumu" label="Tümü" selected={!criteria.category} onPress={() => setCriteria({ category: undefined })} />
        {CATEGORIES.map((c) => (
          <Chip key={c.id} testID={`kategori-${c.id}`} label={c.label} selected={criteria.category === c.id} onPress={() => setCriteria({ category: criteria.category === c.id ? undefined : c.id })} />
        ))}
        <View style={{ width: space.lg - 8 }} />
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text testID="sonuc-sayisi" style={type.h3}>{out.results.length} tarif</Text>
        <Chip testID="siralama-ac" icon="swap" label={SORTS.find((s) => s.id === criteria.sort)?.label ?? 'Sırala'} onPress={() => setShowSort((v) => !v)} />
      </View>
      {showSort ? (
        <Card style={{ gap: 4, paddingVertical: space.sm }}>
          {SORTS.map((s) => (
            <Chip
              key={s.id}
              testID={`siralama-${s.id}`}
              label={s.label}
              selected={criteria.sort === s.id}
              onPress={() => {
                setCriteria({ sort: s.id });
                setShowSort(false);
              }}
            />
          ))}
        </Card>
      ) : null}
      {out.categoryNotice ? <Text style={type.small}>{out.categoryNotice}</Text> : null}

      {app.integrationLoading && !app.integration ? <Text style={type.small}>Fiyatlar yükleniyor…</Text> : null}

      {pickResults.length > 0 && !criteria.category ? (
        <Card testID="one-cikanlar" style={{ gap: space.md, backgroundColor: colors.saffronSoft, borderColor: colors.saffronSoft }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="sparkles" size={18} color={colors.saffron} />
            <Text style={[type.h3, { color: colors.saffron }]}>{picks?.usedAi ? 'AI önerisi' : 'Tencere\'nin seçimi'}</Text>
          </View>
          {pickResults.map(({ p, r }, idx) => (
            <View key={p.recipeId} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
              <Text style={[type.h2, { color: colors.saffron, width: 20 }]}>{idx + 1}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[type.h3, { textDecorationLine: 'underline' }]} onPress={() => open(r.recipe.id)} accessibilityRole="link">
                  {r.recipe.title}
                </Text>
                <Text style={type.small}>{p.reason}</Text>
              </View>
            </View>
          ))}
          {picks?.usedAi ? <Text style={[type.small, { fontSize: 11 }]}>AI yalnızca bütçe, ekipman, diyet ve alerji kurallarından geçmiş tarifler arasından seçer; fiyatları AI hesaplamaz.</Text> : null}
        </Card>
      ) : null}

      {out.results.length === 0 ? (
        <EmptyState
          icon="search"
          title="Bu koşullara uyan tarif yok"
          body={reasons.length ? `${reasons.join(', ')}.` : 'Kriterleri biraz genişletmeyi dene.'}
          action={
            <View style={{ gap: 8, width: '100%' }}>
              {criteria.budget ? <Button variant="secondary" label="Bütçeyi kaldır" onPress={() => setCriteria({ budget: undefined })} testID="bos-butce-kaldir" /> : null}
              {criteria.category ? <Button variant="secondary" label="Kategoriyi kaldır" onPress={() => setCriteria({ category: undefined })} /> : null}
              {criteria.budgetMode === 'checkout' && ex.budget ? (
                <Button variant="ghost" label="Yalnızca tüketilen payı say" onPress={() => setCriteria({ budgetMode: 'consumption' })} testID="bos-tuketim-modu" />
              ) : null}
            </View>
          }
        />
      ) : (
        <View style={{ gap: space.lg }}>
          {out.results.map((r) => (
            <RecipeCard key={r.recipe.id} result={r} priceIsDemo={price.isDemo} onPress={() => open(r.recipe.id)} />
          ))}
        </View>
      )}

      {out.overBudget.length > 0 ? (
        <View style={{ gap: space.md }} testID="butce-disi">
          <SectionTitle title="Bütçeni biraz aşanlar" subtitle="Bunlar seçtiğin bütçeye sığmıyor; karşılaştırma için gösteriliyor." />
          {out.overBudget.map((r) => (
            <RecipeCard key={r.recipe.id} compact result={r} priceIsDemo={price.isDemo} onPress={() => open(r.recipe.id)} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
