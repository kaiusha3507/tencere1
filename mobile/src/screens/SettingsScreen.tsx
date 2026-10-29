import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { APPLIANCES } from '../core/data/appliances.ts';
import { ALLERGENS, DIETS, INGREDIENT_BY_ID } from '../core/data/ingredients.ts';
import type { RetailCapabilities } from '../core/retail/types.ts';
import { DEMO_PRICES_AS_OF } from '../core/retail/demo-catalog.ts';
import { RECIPES } from '../core/data/recipes/index.ts';
import { formatQuantity } from '../core/units.ts';
import { useApp } from '../state/AppState.tsx';
import { Screen } from '../ui/Screen.tsx';
import { Badge, Banner, Button, Card, Chip, Field, IconButton, Segmented, Stepper, ToggleRow } from '../ui/components.tsx';
import { IngredientPicker } from '../ui/IngredientPicker.tsx';
import { Icon } from '../ui/Icon.tsx';
import { colors, space, type } from '../ui/theme.ts';

const CAP_LABELS: [keyof RetailCapabilities, string][] = [
  ['pricing', 'Fiyat ve paket boyutu'],
  ['productSearch', 'Ürün arama'],
  ['ingredientMatching', 'Malzeme → ürün eşleştirme'],
  ['locationAvailability', 'Konuma göre stok'],
  ['cartCreation', 'Migros sepeti oluşturma'],
  ['storefrontLink', 'Migros resmi sitesine yönlendirme'],
];

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export function SettingsScreen() {
  const app = useApp();
  const { prefs } = app;
  const [apiUrl, setApiUrl] = useState(prefs.apiUrl);
  const [city, setCity] = useState(prefs.city);
  const [district, setDistrict] = useState(prefs.district);
  const integ = app.integration;

  const update = (patch: Partial<typeof prefs>) => {
    const next = { ...prefs, ...patch };
    void app.savePreferences(next);
    // Varsayılanlar o anki aramaya da yansısın
    app.setCriteria((c) => ({
      ...c,
      servings: next.servings,
      appliances: next.appliances,
      diets: next.diets,
      allergens: next.allergens,
      budgetMode: next.budgetMode,
      basicsAtHome: next.basicsAtHome,
      spicesAtHome: next.spicesAtHome,
    }));
  };

  const saveServer = async () => {
    const url = apiUrl.trim();
    if (url && !/^https?:\/\/[^\s]+$/.test(url)) {
      app.showToast('Adres http:// veya https:// ile başlamalı.', 'error');
      return;
    }
    await app.savePreferences({ ...prefs, apiUrl: url });
    await app.reconnect(url);
    app.showToast(url ? 'Sunucu bağlantısı denendi.' : 'Sunucu kaldırıldı; cihazdaki örnek veriler kullanılıyor.', 'info');
  };

  const pantryIds = Object.keys(app.pantry);
  const caps = integ?.checkout.mode === 'partner' ? integ.checkout.capabilities : integ?.pricing.capabilities;

  return (
    <Screen testID="ekran-ayarlar" title="Ayarlar" subtitle="Tercihler, kiler ve entegrasyon durumu">
      {/* Entegrasyon durumu */}
      <Card style={{ gap: space.md }} testID="entegrasyon-durumu">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="cart" />
          <Text style={[type.h3, { flex: 1 }]}>Migros entegrasyonu</Text>
          <Badge label={integ?.pricing.mode === 'partner' ? 'Yetkili kaynak' : 'Örnek veri'} tone={integ?.pricing.mode === 'partner' ? 'herb' : 'saffron'} />
        </View>
        <Text style={type.small}>{app.integrationLoading ? 'Kontrol ediliyor…' : integ?.health.message}</Text>
        <View style={{ gap: 6 }}>
          {CAP_LABELS.map(([k, label]) => {
            const on = !!caps?.[k];
            return (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} testID={`yetenek-${k}`}>
                <Icon name={on ? 'check' : 'x'} size={16} color={on ? colors.herb : colors.inkMuted} strokeWidth={2.4} />
                <Text style={[type.body, { color: on ? colors.ink : colors.inkMuted }]}>{label}</Text>
                <Text style={[type.small, { marginLeft: 'auto' }]}>{on ? 'Destekleniyor' : 'Yok'}</Text>
              </View>
            );
          })}
        </View>
        <Banner tone="neutral">
          {`Migros'un üçüncü taraf uygulamalara açık, belgelenmiş bir sepet/fiyat API'si bulunamadı. Bu yüzden Tencere gerçek Migros sepetine ürün eklemez; fiyatlar ${DEMO_PRICES_AS_OF} tarihli temsili örnek verilerdir. Yetkili erişim sağlanırsa aşağıdaki sunucu üzerinden bağlanır.`}
        </Banner>
      </Card>

      {/* Sunucu */}
      <Card style={{ gap: space.md }}>
        <Text style={type.h3}>Tencere sunucusu (isteğe bağlı)</Text>
        <Text style={type.small}>AI asistanı ve ileride yetkili Migros entegrasyonu için. Boş bırakırsan uygulama tamamen telefonda çalışır.</Text>
        <Field testID="sunucu-adresi" label="Sunucu adresi" value={apiUrl} onChangeText={setApiUrl} placeholder="http://192.168.1.20:8787" keyboardType="url" />
        <Button testID="sunucu-kaydet" small label="Kaydet ve bağlantıyı test et" icon="check" onPress={saveServer} loading={app.integrationLoading} />
        {integ?.server ? (
          <View style={{ gap: 4 }}>
            <Text style={type.small}>Sunucu: {integ.server.reachable ? 'ulaşılabiliyor ✓' : 'ulaşılamadı ✕'}</Text>
            <Text style={type.small}>AI asistanı: {integ.server.aiAvailable ? 'açık ✓' : 'kapalı (kurallı mod)'}</Text>
          </View>
        ) : (
          <Text style={type.small}>AI asistanı: kapalı — istekler yerleşik Türkçe kurallarla anlaşılır.</Text>
        )}
      </Card>

      {/* Varsayılanlar */}
      <Card style={{ gap: space.md }}>
        <Text style={type.h3}>Varsayılan tercihler</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={type.body}>Kişi sayısı</Text>
          <Stepper testID="ayar-kisi" label="Varsayılan kişi sayısı" value={prefs.servings} onChange={(v) => update({ servings: v })} />
        </View>
        <Text style={type.tiny}>BÜTÇE HESABI</Text>
        <Segmented
          value={prefs.budgetMode}
          onChange={(v) => update({ budgetMode: v })}
          options={[
            { id: 'checkout', label: 'Kasa tutarı' },
            { id: 'consumption', label: 'Tüketilen pay' },
          ]}
        />
        <ToggleRow label="Tuz, karabiber, sıvı yağ evde var" value={prefs.basicsAtHome} onChange={(v) => update({ basicsAtHome: v })} />
        <ToggleRow label="Kuru baharatlar evde var" value={prefs.spicesAtHome} onChange={(v) => update({ spicesAtHome: v })} />
        <Text style={type.tiny}>EKİPMANLARIM</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {APPLIANCES.map((a) => (
            <Chip key={a.id} testID={`ayar-ekipman-${a.id}`} label={a.short} selected={prefs.appliances.includes(a.id)} onPress={() => update({ appliances: toggle(prefs.appliances, a.id) })} />
          ))}
        </View>
        <Text style={type.tiny}>DİYET</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {DIETS.map((d) => (
            <Chip key={d.id} tone="herb" label={d.name} selected={prefs.diets.includes(d.id)} onPress={() => update({ diets: toggle(prefs.diets, d.id) })} />
          ))}
        </View>
        <Text style={type.tiny}>ALERJİLER</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ALLERGENS.map((a) => (
            <Chip key={a.id} tone="danger" label={a.name} selected={prefs.allergens.includes(a.id)} onPress={() => update({ allergens: toggle(prefs.allergens, a.id) })} />
          ))}
        </View>
      </Card>

      {/* Kiler */}
      <Card style={{ gap: space.md }} testID="kiler">
        <Text style={type.h3}>Kilerim</Text>
        <Text style={type.small}>Burada işaretlediğin malzemeler her aramada "evde var" sayılır ve alışveriş listesine eklenmez.</Text>
        {pantryIds.length ? (
          <View style={{ gap: 6 }}>
            {pantryIds.map((id) => (
              <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="check" size={16} color={colors.herb} />
                <Text style={[type.body, { flex: 1 }]}>
                  {INGREDIENT_BY_ID[id]?.name ?? id}
                  {app.pantry[id]?.quantity !== undefined ? ` · ${formatQuantity(app.pantry[id]!.quantity!, INGREDIENT_BY_ID[id]!.baseUnit)}` : ''}
                </Text>
                <IconButton icon="x" label={`${INGREDIENT_BY_ID[id]?.name} kilerden çıkar`} onPress={() => void app.setPantryItem(id, null)} testID={`kiler-cikar-${id}`} />
              </View>
            ))}
          </View>
        ) : (
          <Text style={[type.small, { color: colors.inkMuted }]}>Kilerin boş.</Text>
        )}
        <IngredientPicker testID="kiler-ekle" selected={[]} disabledIds={pantryIds} onToggle={(id) => void app.setPantryItem(id, {})} placeholder="Kilere malzeme ekle…" />
      </Card>

      {/* Konum */}
      <Card style={{ gap: space.md }}>
        <Text style={type.h3}>Konum</Text>
        <Text style={type.small}>Konuma göre stok bilgisi yalnızca yetkili bir Migros entegrasyonu bunu desteklerse kullanılır; şu an desteklenmiyor. Bilgi yalnızca telefonunda saklanır.</Text>
        <Field label="İl" value={city} onChangeText={setCity} placeholder="ör. Antalya" />
        <Field label="İlçe" value={district} onChangeText={setDistrict} placeholder="ör. Muratpaşa" />
        <Button small variant="secondary" label="Konumu kaydet" onPress={() => { void app.savePreferences({ ...prefs, city: city.trim(), district: district.trim() }); app.showToast('Konum kaydedildi.'); }} />
      </Card>

      {/* Veri */}
      <Card style={{ gap: space.md }}>
        <Text style={type.h3}>Verilerim</Text>
        <Text style={type.small}>Kaydedilen tarifler, alışveriş listesi, kiler ve tercihler yalnızca bu telefonda (SQLite) saklanır. Hesap gerekmez.</Text>
        <Button
          testID="verileri-sil"
          variant="danger"
          icon="trash"
          label="Tüm verileri sil"
          onPress={() =>
            Alert.alert('Tüm veriler silinsin mi?', 'Kaydedilenler, liste, kiler ve tercihler silinir. Bu işlem geri alınamaz.', [
              { text: 'Vazgeç', style: 'cancel' },
              { text: 'Sil', style: 'destructive', onPress: () => void app.clearAll().then(() => app.showToast('Tüm veriler silindi.', 'info')) },
            ])
          }
        />
      </Card>

      <View style={{ gap: 4, paddingBottom: space.lg }}>
        <Text style={[type.small, { color: colors.inkMuted }]}>Tencere 0.1.0 · {RECIPES.length} editoryal tarif</Text>
        <Text style={[type.small, { color: colors.inkMuted }]}>Tarif görselleri Tencere'nin özgün illüstrasyonlarıdır; fotoğraf değildir. Besin değerleri henüz doğrulanmadığı için gösterilmez.</Text>
      </View>
    </Screen>
  );
}
