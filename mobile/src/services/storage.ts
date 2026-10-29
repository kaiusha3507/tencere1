import Storage from 'expo-sqlite/kv-store';
import type { KeyValueStorage } from '../core/storage/repository.ts';

/**
 * Cihaz üzerinde kalıcı depolama: expo-sqlite'ın anahtar-değer deposu
 * (telefonda gerçek bir SQLite veritabanı dosyası). Uygulama kapatılıp
 * açıldığında veriler korunur; internet gerekmez.
 */
export const deviceStorage: KeyValueStorage = {
  async getItem(key) {
    return (await Storage.getItem(key)) ?? null;
  },
  async setItem(key, value) {
    await Storage.setItem(key, value);
  },
  async removeItem(key) {
    await Storage.removeItem(key);
  },
};
