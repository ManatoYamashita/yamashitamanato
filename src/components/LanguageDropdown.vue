<template>
  <div ref="rootRef" :class="['lang-dropdown', variantClass]">
    <button
      class="lang-dropdown-toggle"
      @click="$emit('toggle')"
      :aria-expanded="isOpen"
      :aria-label="ariaLabel"
    >
      <font-awesome-icon :icon="faGlobe" class="globe-icon" />
      <span class="current-lang-label">{{ currentLabel }}</span>
      <font-awesome-icon
        :icon="faChevronDown"
        class="chevron-icon"
        :class="{ rotated: isOpen }"
      />
    </button>

    <transition name="dropdown-slide">
      <ul class="lang-dropdown-menu" v-show="isOpen">
        <li v-for="lang in languages" :key="lang.code">
          <button
            @click="$emit('select', lang.code)"
            :class="{ active: currentLocale === lang.code }"
            class="lang-option-btn"
          >
            <font-awesome-icon
              :icon="faCheck"
              class="check-icon"
              v-show="currentLocale === lang.code"
            />
            <span>{{ lang.label }}</span>
          </button>
        </li>
      </ul>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faGlobe, faChevronDown, faCheck } from '@fortawesome/free-solid-svg-icons';
import type { Locale } from '@/types';

interface Language {
  code: Locale;
  label: string;
}

const props = defineProps<{
  isOpen: boolean;
  currentLabel: string;
  languages: Language[];
  currentLocale: Locale;
  ariaLabel: string;
  variant?: 'desktop' | 'mobile' | 'home';
}>();

defineEmits<{
  toggle: [];
  select: [code: Locale];
}>();

const variantClass = computed(() => `lang-dropdown--${props.variant ?? 'desktop'}`);

const rootRef = ref<HTMLElement | null>(null);
defineExpose({ rootRef });
</script>

<style lang="css" scoped>
/* 共通ドロップダウンスタイル */
.lang-dropdown {
  position: relative;
  flex: 0 0 auto;
  z-index: 200;
}

.lang-dropdown-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #111;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
  color: #111;
  font-size: 1rem;
  white-space: nowrap;
}

.lang-dropdown-toggle:hover {
  background: #f0d300;
  border-color: #d7a800;
  transform: translateY(-2px);
}

.globe-icon {
  font-size: 1.2rem;
}

.current-lang-label {
  font-size: 1rem;
  white-space: nowrap;
}

.chevron-icon {
  font-size: 0.8rem;
  transition: transform 0.3s ease;
}

.chevron-icon.rotated {
  transform: rotate(180deg);
}

.lang-dropdown-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 150px;
  background: #fff;
  border: 1px solid #111;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 0.5rem 0;
  z-index: 200;
  list-style: none;
  margin: 0;
}

.lang-option-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease;
  font-size: 1rem;
  color: #111;
}

.lang-option-btn:hover {
  background: #f0d300;
}

.lang-option-btn.active {
  font-weight: bold;
  background: #fef9e0;
}

.check-icon {
  font-size: 1rem;
  color: #d7a800;
  flex-shrink: 0;
  width: 1rem;
  display: inline-block;
}

/* ドロップダウンアニメーション */
.dropdown-slide-enter-active,
.dropdown-slide-leave-active {
  transition: all 0.25s ease;
  transform-origin: top center;
}

.dropdown-slide-enter-from {
  opacity: 0;
  transform: translateY(0) scaleY(0.8);
}

.dropdown-slide-leave-to {
  opacity: 0;
  transform: translateY(0) scaleY(0.8);
}

/* --- バリアント別スタイル --- */

/* デスクトップバリアント */
.lang-dropdown--desktop {
  margin-left: 0;
}

/* モバイルバリアント */
.lang-dropdown--mobile .current-lang-label {
  display: inline;
}

@media screen and (max-width: 768px) {
  .lang-dropdown--mobile .lang-dropdown-toggle {
    padding: 0.5rem;
  }

  .lang-dropdown--mobile .lang-dropdown-menu {
    min-width: 110px;
  }
}

/* ホームバリアント */
.lang-dropdown--home {
  z-index: 1;
  margin-left: 1.5rem;
}

.lang-dropdown--home .check-icon {
  font-size: 0.9rem;
}

/* タッチデバイスではホバー効果を無効化 */
@media (hover: hover) and (pointer: fine) {
  .lang-dropdown--home .lang-dropdown-toggle:hover {
    background: #f0d300;
    border-color: #d7a800;
    transform: translateY(-2px);
  }

  .lang-dropdown--home .lang-option-btn:hover {
    background: #f0d300;
  }
}

/* Tablet: 541px - 768px */
@media screen and (max-width: 768px) and (min-width: 541px) {
  .lang-dropdown--home {
    margin-left: 0;
    margin-top: 0;
    flex-basis: 100%;
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .lang-dropdown--home .lang-dropdown-menu {
    right: auto;
    left: 50%;
    transform: translateX(-50%);
  }
}

/* Mobile: 540px以下 */
@media screen and (max-width: 540px) {
  .lang-dropdown--home {
    margin-left: 0;
    margin-top: 0.5rem;
    width: 100%;
    display: flex;
    justify-content: center;
    max-width: 280px;
  }

  .lang-dropdown--home .lang-dropdown-toggle {
    font-size: 0.95rem;
    padding: 0.5rem 1rem;
    min-height: 44px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lang-dropdown--home .globe-icon {
    font-size: 1.1rem;
  }

  .lang-dropdown--home .current-lang-label {
    font-size: 0.95rem;
  }

  .lang-dropdown--home .chevron-icon {
    font-size: 0.75rem;
  }

  .lang-dropdown--home .lang-dropdown-menu {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    min-width: 180px;
    max-width: 90vw;
  }

  .lang-dropdown--home .lang-option-btn {
    font-size: 0.95rem;
    padding: 0.75rem 1.2rem;
    min-height: 44px;
  }
}

/* iPhone SE 等の超小型デバイス対応 */
@media screen and (max-width: 540px) and (max-height: 700px) {
  .lang-dropdown--home .lang-dropdown-toggle {
    font-size: 0.9rem;
    padding: 0.4rem 0.9rem;
    min-height: 40px;
  }
}
</style>
