import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { APPLIANCES } from '../core/data/appliances.ts';
import { ALLERGENS, DIETS } from '../core/data/ingredients.ts';
import type { ApplianceId, Cuisine, MealType } from '../core/types.ts';
import { mergeParsed } from '../core/ai/rule-parser.ts';
import { formatTL } from '../core/text.ts';
import { useApp } from '../state/AppState.tsx';
import { useSearch } from '../state/hooks.ts';
import { useNav } from '../navigation.tsx';
import { Screen } from '../ui/Screen.tsx';
import { Banner, Button, Card, Chip, Segmented, Stepper, ToggleRow } from '../ui/components.tsx';
import { Icon } from '../ui/Icon.tsx';
import { Wordmark } from '../ui/Logo.tsx';
import { IngredientPicker } from '../ui/IngredientPicker.tsx';
import { colors, radius, shadow, space, type } from '../ui/theme.ts';

const QUICK_BUDGETS = [100, 150, 200, 300];
const TIMES: { label: string; value?: number }[] = [{ label: '15 dk', value: 15 }, { label: '30 dk', value: 30 }, { label: '45 dk', value: 45 }, { label: '1 saat', value: 60 }, { label: 'Fark etmez' }];
const MEALS: { id: MealType; label: string }[] = [
  { id: 'kahvalti', label: 'Kahvaltı' },
  { id: 'ana-yemek', label: 'Ana yemek' },
  { id: 'corba', label: 'Çorba' },
  { id: 'ara-ogun', label: 'Ara öğün' },
  { id: 'salata', label: 'Salata' },
];

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export function HomeScreen() {
  const app = useApp();
  const { criteria, setCriteria } = app;
  const nav = useNav();
  const out = useSearch();
  const [budgetText, setBudgetText] = useState(criteria.budget ? String(criteria.budget) : '');
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [nl, setNl] = useState('');
  const [understood, setUnderstood] = useState<{ items: string[]; usedAi: boolean } | null>(null);
  const [interpreting, setInterpreting] = useState(false);
  const [showMore, setShowMore] = useState(criteria.diets.length > 0 || criteria.allergens.length > 0);

  const applyBudgetText = (t: string) => {
    const clean = t.replace(/[^0-9.,]/g, '');
    setBudgetText(clean);
    if (!clean) {
      setBudgetError(null);
      setCriteria({ budget: undefined });
      return;
    }
    const v = Number(clean.replace(',', '.'));
    if (!Number.isFinite(v) || v <= 0) {
      setBudgetError('Geçerli bir tutar girin');
      return;
    }
    if (v > 100000) {
      setBudgetError('Tutar çok yüksek görünüyor');
      return;
    }
    setBudgetError(null);
    setCriteria({ budget: v });
  };

  const interpret = async () => {
    if (!nl.trim()) return;
    setInterpreting(true);
    try {
      const r = await app.assistant.interpret(nl);
      setCriteria((c) => mergeParsed(c, r.criteria));
      if (r.criteria.budget !== undefined) setBudgetText(String(r.criteria.budget));
      app.setRequest(nl);
      setUnderstood({ items: r.understood.length ? r.understood : ['Belirgin bir tercih bulamadım; formu kullanabilirsin.'], usedAi: r.usedAi });
      if (r.criteria.diets?.length || r.criteria.allergens?.length) setShowMore(true);
    } finally {
      setInterpreting(false);
    }
  };

  const submit = async () => {
    if (budgetError) return;
    const parts = [criteria.budget ? formatTL(criteria.budget, { round: true }) : 'Bütçesiz', `${criteria.servings} kişi`];
    if (criteria.appliances.length) parts.push(criteria.appliances.map((a) => APPLIANCES.find((x) => x.id === a)?.short ?? a).join(', '));
    await app.commitSearch(parts.join(' · '));
    nav.setTab('tarifler');
  };

  const count = out.results.length;

  return (
    <Screen
      testID="ekran-kesfet"
      header={
        <View style={{ gap: space.lg }}>
          <Wordmark />
          <View style={{ gap: 6 }}>
            <Text style={type.hero}>Bütçen. Mutfağın.{'\n'}Sıradaki yemeğin.</Text>
            <Text style={[type.body, { color: colors.inkSoft }]}>Ne kadar harcamak istediğini ve mutfağında ne olduğunu söyle; Migros'tan alabileceğin malzemelerle yapabileceklerini bulalım.</Text>
          </View>
        </View>
      }
      footer={
        <Button
          testID="tarifleri-bul"
          label={count > 0 ? `${count} tarifi göster` : 'Tarifleri bul'}
          icon="search"
          onPress={submit}
          disabled={!!budgetError}
        />
      }
    >
      {/* Doğal dil asistanı */}
      <Card style={{ gap: space.md, backgroundColor: colors.ink, borderColor: colors.ink }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="sparkles" size={18} color={colors.saffronSoft} />
          <Text style={{ color: colors.saffronSoft, fontWeight: '700', fontSize: 14 }}>Ne canın çekiyor?</Text>
        </View>
        <TextInput
          testID="asistan-girdi"
          value={nl}
          onChangeText={setNl}
          placeholder="ör. 2 kişi 150 TL, fırınım yok, tavuklu bir şey"
          placeholderTextColor="#A39886"
          onSubmitEditing={interpret}
          returnKeyType="search"
          accessibilityLabel="Ne yemek istediğini yaz"
          style={{ minHeight: 48, borderRadius: radius.md, backgroundColor: '#2C2721', color: colors.white, paddingHorizontal: space.md, fontSize: 16 }}
        />
        <Button testID="asistan-anla" label="Formu doldur" icon="sparkles" variant="secondary" small onPress={interpret} loading={interpreting} disabled={!nl.trim()} style={{ alignSelf: 'flex-start' }} />
        {understood ? (
          <View testID="asistan-sonuc" style={{ gap: 6 }}>
            <Text style={{ color: '#CFC5B5', fontSize: 12 }}>{understood.usedAi ? 'AI ile anlaşıldı · kurallarla doğrulandı' : 'Kurallarla anlaşıldı (AI kapalı)'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {understood.items.map((u) => (
                <View key={u} style={{ backgroundColor: '#3A332B', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ color: colors.white, fontSize: 12 }}>{u}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </Card>

      {/* Bütçe */}
      <Card style={{ gap: space.md }} testID="kart-butce">
        <Text style={type.tiny}>BİR ÖĞÜN İÇİN BÜTÇE</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 40, color: colors.inkSoft, fontFamily: type.hero.fontFamily }}>₺</Text>
          <TextInput
            testID="butce-girdi"
            value={budgetText}
            onChangeText={applyBudgetText}
            placeholder="0"
            placeholderTextColor={colors.line}
            keyboardType="decimal-pad"
            accessibilityLabel="Bütçe (Türk lirası)"
            style={{ flex: 1, fontSize: 44, fontFamily: type.hero.fontFamily, color: colors.ink, paddingVertical: 4 }}
          />
        </View>
        {budgetError ? <Text testID="butce-hata" style={{ color: colors.danger, fontSize: 13 }}>{budgetError}</Text> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {QUICK_BUDGETS.map((b) => (
            <Chip key={b} testID={`butce-${b}`} label={`₺${b}`} selected={criteria.budget === b} onPress={() => applyBudgetText(String(b))} />
          ))}
          <Chip testID="butce-yok" label="Bütçe yok" selected={criteria.budget === undefined} onPress={() => applyBudgetText('')} />
        </View>
        <Segmented
          testID="butce-modu"
          value={criteria.budgetMode}
          onChange={(v) => setCriteria({ budgetMode: v })}
          options={[
            { id: 'checkout', label: 'Kasa tutarı' },
            { id: 'consumption', label: 'Tüketilen pay' },
          ]}
        />
        <Text style={type.small}>
          {criteria.budgetMode === 'checkout'
            ? 'Paketlerin tamamını alacağını varsayar: bütçeye sığan tarif gerçekten o parayla alışverişi bitirir.'
            : 'Yalnızca tarifte kullanılan miktarın payını sayar; paketler bütçeyi aşabilir ve bu açıkça gösterilir.'}
        </Text>
      </Card>

      {/* Kişi sayısı */}
      <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <Icon name="users" />
          <View style={{ flex: 1 }}>
            <Text style={type.h3}>Kaç kişilik?</Text>
            <Text style={type.small}>Miktarlar buna göre ölçeklenir</Text>
          </View>
        </View>
        <Stepper testID="kisi" label="Kişi sayısı" value={criteria.servings} onChange={(v) => setCriteria({ servings: v })} />
      </Card>

      {/* Ekipman */}
      <View style={{ gap: space.md }}>
        <View>
          <Text style={type.h2}>Mutfağında neler var?</Text>
          <Text style={type.small}>Seçmediğin ekipmanı gerektiren tarifler gösterilmez.</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {APPLIANCES.map((a) => {
            const on = criteria.appliances.includes(a.id);
            return (
              <Pressable
                key={a.id}
                testID={`ekipman-${a.id}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={a.name}
                onPress={() => setCriteria((c) => ({ ...c, appliances: toggle<ApplianceId>(c.appliances, a.id) }))}
                style={({ pressed }) => [
                  {
                    width: '31%',
                    flexGrow: 1,
                    minHeight: 92,
                    borderRadius: radius.md,
                    borderWidth: 1.5,
                    borderColor: on ? colors.tomato : colors.line,
                    backgroundColor: on ? colors.tomatoSoft : colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: 8,
                    opacity: pressed ? 0.85 : 1,
                  },
                  on ? {} : shadow.card,
                ]}
              >
                <Icon name={a.id} size={30} color={on ? colors.tomatoDark : colors.inkSoft} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: on ? colors.tomatoDark : colors.ink, textAlign: 'center' }}>{a.short}</Text>
                {on ? (
                  <View style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.tomato, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={12} color={colors.white} strokeWidth={3} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        {criteria.appliances.length === 0 ? (
          <Banner tone="neutral">Ekipman seçmedin; tüm tarifler gösterilecek.</Banner>
        ) : null}
      </View>

      {/* Süre */}
      <View style={{ gap: space.md }}>
        <Text style={type.h2}>Ne kadar vaktin var?</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TIMES.map((t) => (
            <Chip key={t.label} testID={`sure-${t.value ?? 'yok'}`} icon="clock" label={t.label} selected={criteria.maxMinutes === t.value} onPress={() => setCriteria({ maxMinutes: t.value })} />
          ))}
        </View>
      </View>

      {/* Evdekiler */}
      <Card style={{ gap: space.sm }}>
        <Text style={type.h3}>Evde olanlar</Text>
        <ToggleRow testID="temel-evde" label="Tuz, karabiber, sıvı yağ evde var" value={criteria.basicsAtHome} onChange={(v) => setCriteria({ basicsAtHome: v })} />
        <ToggleRow testID="baharat-evde" label="Kuru baharatlar evde var" hint="Pul biber, kimyon, kekik, nane, toz biber" value={criteria.spicesAtHome} onChange={(v) => setCriteria({ spicesAtHome: v })} />
        <Text style={[type.small, { marginTop: 4 }]}>Elindeki diğer malzemeler (alışveriş listesinden düşülür):</Text>
        <IngredientPicker testID="evde" selected={criteria.have} disabledIds={criteria.exclude} onToggle={(id) => setCriteria((c) => ({ ...c, have: toggle(c.have, id) }))} />
      </Card>

      {/* Daha fazla seçenek */}
      <Pressable testID="daha-fazla" accessibilityRole="button" onPress={() => setShowMore((s) => !s)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
        <Text style={[type.h3, { color: colors.tomato }]}>{showMore ? 'Daha az seçenek' : 'Diyet, alerji ve diğer tercihler'}</Text>
        <Icon name="chevronDown" size={18} color={colors.tomato} />
      </Pressable>
      {showMore ? (
        <View style={{ gap: space.lg }}>
          <View style={{ gap: space.sm }}>
            <Text style={type.h3}>Beslenme tercihi</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {DIETS.map((d) => (
                <Chip key={d.id} testID={`diyet-${d.id}`} tone="herb" icon="leaf" label={d.name} selected={criteria.diets.includes(d.id)} onPress={() => setCriteria((c) => ({ ...c, diets: toggle(c.diets, d.id) }))} />
              ))}
            </View>
          </View>
          <View style={{ gap: space.sm }}>
            <Text style={type.h3}>Alerjiler (kesinlikle içermesin)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {ALLERGENS.map((a) => (
                <Chip key={a.id} testID={`alerji-${a.id}`} tone="danger" label={a.name} selected={criteria.allergens.includes(a.id)} onPress={() => setCriteria((c) => ({ ...c, allergens: toggle(c.allergens, a.id) }))} />
              ))}
            </View>
          </View>
          <View style={{ gap: space.sm }}>
            <Text style={type.h3}>İstemediğin malzemeler</Text>
            <IngredientPicker testID="haric" tone="danger" placeholder="ör. mantar" selected={criteria.exclude} disabledIds={criteria.have} onToggle={(id) => setCriteria((c) => ({ ...c, exclude: toggle(c.exclude, id) }))} />
          </View>
          <View style={{ gap: space.sm }}>
            <Text style={type.h3}>Öğün</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MEALS.map((m) => (
                <Chip key={m.id} testID={`ogun-${m.id}`} label={m.label} selected={criteria.mealType === m.id} onPress={() => setCriteria({ mealType: criteria.mealType === m.id ? undefined : m.id })} />
              ))}
            </View>
          </View>
          <View style={{ gap: space.sm }}>
            <Text style={type.h3}>Mutfak</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {([['turk', 'Türk mutfağı'], ['dunya', 'Dünya mutfağı']] as [Cuisine, string][]).map(([id, label]) => (
                <Chip key={id} testID={`mutfak-${id}`} label={label} selected={criteria.cuisine === id} onPress={() => setCriteria({ cuisine: criteria.cuisine === id ? undefined : id })} />
              ))}
            </View>
          </View>
        </View>
      ) : null}

      {app.recent.length ? (
        <View style={{ gap: space.sm }}>
          <Text style={type.h3}>Son aramalar</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {app.recent.slice(0, 4).map((r) => (
              <Chip
                key={r.label}
                icon="clock"
                label={r.label}
                onPress={() => {
                  setCriteria(r.criteria);
                  setBudgetText(r.criteria.budget ? String(r.criteria.budget) : '');
                  nav.setTab('tarifler');
                }}
              />
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
