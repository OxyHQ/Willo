import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// expo-secure-store wraps the OS keychain, which has no equivalent on web.
// Fall back to localStorage there; SecureStore itself is used on native.
export const getItemAsync = (key: string): Promise<string | null> =>
  Platform.OS === 'web'
    ? Promise.resolve(window.localStorage.getItem(key))
    : SecureStore.getItemAsync(key);

export const setItemAsync = (key: string, value: string): Promise<void> =>
  Platform.OS === 'web'
    ? Promise.resolve(window.localStorage.setItem(key, value))
    : SecureStore.setItemAsync(key, value);

export const deleteItemAsync = (key: string): Promise<void> =>
  Platform.OS === 'web'
    ? Promise.resolve(window.localStorage.removeItem(key))
    : SecureStore.deleteItemAsync(key);
