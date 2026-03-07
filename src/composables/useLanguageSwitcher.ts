import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Locale } from '@/types';

interface Language {
  code: Locale;
  label: string;
}

const languages: Language[] = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
];

export function useLanguageSwitcher(dropdownRefs: () => (HTMLElement | null)[]) {
  const { locale } = useI18n<{ message: string }, Locale>();

  const isDropdownOpen = ref(false);

  const currentLanguageLabel = computed<string>(() => {
    const current = languages.find((lang) => lang.code === locale.value);
    return current ? current.label : '日本語';
  });

  const toggleDropdown = (): void => {
    isDropdownOpen.value = !isDropdownOpen.value;
  };

  const selectLanguage = (langCode: Locale): void => {
    if (locale.value !== langCode) {
      locale.value = langCode;
    }
    isDropdownOpen.value = false;
  };

  const handleClickOutside = (event: MouseEvent): void => {
    const target = event.target as Node;
    const refs = dropdownRefs();
    const isOutside = refs.every((el) => !el || !el.contains(target));
    if (isOutside) {
      isDropdownOpen.value = false;
    }
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && isDropdownOpen.value) {
      isDropdownOpen.value = false;
    }
  };

  onMounted(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleKeyDown);
  });

  return {
    locale,
    languages,
    isDropdownOpen,
    currentLanguageLabel,
    toggleDropdown,
    selectLanguage,
  };
}
