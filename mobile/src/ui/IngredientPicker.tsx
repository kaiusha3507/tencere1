import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { INGREDIENTS, INGREDIENT_BY_ID } from '../core/data/ingredients.ts';
import { normalizeTr } from '../core/text.ts';
import { Chip, Field } from './components.tsx';
import { colors, type } from './theme.ts';

const POPULAR = ['yumurta', 'domates', 'sogan', 'patates', 'pirinc', 'makarna', 'tavuk-gogus', 'yogurt', 'kirmizi-mercimek', 'bulgur', 'dana-kiyma', 'beyaz-peynir'];

/** Malzeme seçici: arama kutusu + seçilebilir çipler. Seçilenler en başta durur. */
export function IngredientPicker({
  selected,
  onToggle,
  tone = 'herb',
  placeholder = 'Malzeme ara…',
  disabledIds = [],
  testID,
}: {
  selected: string[];
  onToggle: (id: string) => void;
  tone?: 'herb' | 'danger';
  placeholder?: string;
  disabledIds?: string[];
  testID?: string;
}) {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const q = normalizeTr(query);
    const pool = INGREDIENTS.filter((i) => !i.free && !disabledIds.includes(i.id) && !selected.includes(i.id));
    if (!q) return POPULAR.map((id) => INGREDIENT_BY_ID[id]).filter((i): i is NonNullable<typeof i> => !!i && pool.includes(i));
    return pool.filter((i) => [i.name, ...(i.aliases ?? [])].some((n) => normalizeTr(n).includes(q))).slice(0, 12);
  }, [query, selected, disabledIds]);

  return (
    <View style={{ gap: 10 }}>
      {selected.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {selected.map((id) => (
            <Chip key={id} testID={testID ? `${testID}-secili-${id}` : undefined} label={`${INGREDIENT_BY_ID[id]?.name ?? id} ✕`} selected tone={tone} onPress={() => onToggle(id)} />
          ))}
        </View>
      ) : null}
      <Field value={query} onChangeText={setQuery} placeholder={placeholder} testID={testID ? `${testID}-ara` : undefined} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {visible.map((i) => (
          <Chip key={i.id} testID={testID ? `${testID}-${i.id}` : undefined} label={i.name} onPress={() => { onToggle(i.id); setQuery(''); }} icon="plus" />
        ))}
        {query && visible.length === 0 ? <Text style={[type.small, { color: colors.inkMuted }]}>Eşleşen malzeme yok.</Text> : null}
      </View>
    </View>
  );
}
