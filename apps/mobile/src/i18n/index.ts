import { useSyncExternalStore } from 'react';
import { getLanguage, getLanguagePreference, setLanguagePreference, subscribeLanguage, systemLanguage, translate, type LanguagePreference } from './locale';

export { setLanguagePreference, systemLanguage };

export function useTr(): (text: string) => string {
  const language = useSyncExternalStore(
    subscribeLanguage,
    getLanguage,
    getLanguage,
  );
  return (text: string) => translate(text, language);
}

export function useLanguagePreference(): LanguagePreference {
  return useSyncExternalStore(
    subscribeLanguage,
    getLanguagePreference,
    getLanguagePreference,
  );
}
