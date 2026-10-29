import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import type { RecipeResult } from '../core/search.ts';
import { formatMinutes, formatTL } from '../core/text.ts';
import { getIngredient } from '../core/data/ingredients.ts';
import { RecipeArt } from './RecipeArt.tsx';
import { Badge, Meter } from './components.tsx';
import { Icon } from './Icon.tsx';
import { colors, radius, shadow, space, type } from './theme.ts';

const DIET_LABEL: Record<string, string> = { vegan: 'Vegan', vejetaryen: 'Vejetaryen', glutensiz: 'Glutensiz', sutsuz: 'Sütsüz' };

export function budgetBadge(r: RecipeResult): { label: string; tone: 'herb' | 'saffron' | 'danger' | 'neutral' } | null {
  switch (r.budget.status) {
    case 'within':
      return { label: 'Bütçeye uygun', tone: 'herb' };
    case 'consumption_only':
      return { label: 'Paketler bütçeyi aşıyor', tone: 'saffron' };
    case 'over':
      return { label: 'Bütçe dışı', tone: 'danger' };
    case 'unknown':
      return { label: 'Fiyat eksik', tone: 'neutral' };
    default:
      return null;
  }
}

export function RecipeCard({ result, onPress, priceIsDemo, compact }: { result: RecipeResult; onPress: () => void; priceIsDemo: boolean; compact?: boolean }) {
  const { width } = useWindowDimensions();
  const { recipe, costing, budget, equipment } = result;
  const artW = Math.min(width, 640) - space.lg * 2;
  const artH = compact ? 110 : Math.round(artW * 0.48);
  const badge = budgetBadge(result);
  const key = recipe.ingredients
    .map((i) => getIngredient(i.ingredientId))
    .filter((i) => !i.free && !i.basic && !i.spice && i.category !== 'sos')
    .slice(0, 4)
    .map((i) => i.name.replace(/ \(.*\)$/, ''));
  const isVegan = result.diets.includes('vegan');
  const diets = result.diets.filter((d) => d === 'vegan' || (d === 'vejetaryen' && !isVegan) || (d === 'glutensiz' && !compact));

  return (
    <Pressable
      testID={`tarif-karti-${recipe.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${recipe.title}, ${costing.complete ? formatTL(costing.purchaseCost) : 'fiyat eksik'}, ${formatMinutes(result.totalMinutes)}`}
      onPress={onPress}
      style={({ pressed }) => [{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, opacity: pressed ? 0.92 : 1 }, shadow.card]}
    >
      <View>
        <RecipeArt recipe={recipe} width={artW} height={artH} />
        <View style={{ position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 6 }}>{badge ? <Badge label={badge.label} tone={badge.tone} /> : null}</View>
        <View style={{ position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', gap: 6 }}>
          {equipment.appliances.map((a) => (
            <View key={a} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={a} size={17} color={colors.ink} />
            </View>
          ))}
        </View>
      </View>
      <View style={{ padding: space.lg, gap: space.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={type.h2} numberOfLines={2}>{recipe.title}</Text>
            <Text style={type.small} numberOfLines={1}>{key.join(' · ')}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {costing.complete ? (
              <>
                <Text testID={`tarif-tutar-${recipe.id}`} style={type.money}>{formatTL(costing.purchaseCost, { round: true })}</Text>
                <Text style={type.small}>{formatTL(costing.costPerServing)}/porsiyon</Text>
              </>
            ) : (
              <Text style={type.small}>Fiyat eksik</Text>
            )}
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="clock" size={15} color={colors.inkSoft} />
            <Text style={type.small}>{formatMinutes(result.totalMinutes)} · hazırlık {recipe.prepMinutes} dk</Text>
          </View>
          {costing.homeShare > 0 ? <Text style={[type.small, { color: colors.herb, fontWeight: '700' }]}>%{Math.round(costing.homeShare * 100)} evde</Text> : null}
          {equipment.via === 'alternative' ? <Badge label="Alternatif yöntemle" tone="neutral" icon="swap" /> : null}
          {diets.map((d) => (
            <Badge key={d} label={DIET_LABEL[d] ?? d} tone="herb" icon="leaf" />
          ))}
        </View>
        {budget.utilization !== null ? (
          <View style={{ gap: 4, marginTop: 2 }}>
            <Meter value={budget.utilization} testID={`butce-oran-${recipe.id}`} />
            <Text style={type.small}>
              Bütçenin %{Math.round(budget.utilization * 100)}'i · tüketilen pay {formatTL(costing.consumptionCost)}
              {priceIsDemo ? ' · örnek fiyat' : ''}
            </Text>
          </View>
        ) : priceIsDemo && costing.complete ? (
          <Text style={[type.small, { color: colors.inkMuted }]}>Kasa tutarı · örnek fiyat</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
