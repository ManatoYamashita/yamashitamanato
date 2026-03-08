<template>
  <div id="main">
    <!-- スプラッシュオーバーレイ -->
    <div v-if="showSplash" ref="splashOverlayRef" class="splash-overlay" aria-hidden="true">
      <img ref="splashLogoRef" :src="logoSvg" alt="" class="splash-logo"
           width="800" height="200" draggable="false" />
    </div>

    <!-- ナビゲーション視覚フィードバック用プログレスバー -->
    <div id="navigation-progress" class="progress-bar">
      <div class="progress-fill"></div>
    </div>

    <!-- ホームページ用 h1（スクリーンリーダー向け） -->
    <h1 v-if="isHomePage" class="sr-only">{{ t('home.title') }}</h1>

    <!-- Menu.vueをヘッダーとして統合 -->
    <header id="navbar">
      <Menu />
    </header>

    <a href="https://www.yamashitamana.to" aria-current="page" class="home-logo">
      <img
        ref="centerLogoRef"
        fetchpriority="high"
        :src="logoSvg"
        alt="ホームページに戻る"
        width="800"
        height="200"
        draggable="false"
        id="center-logo"
        :class="className"
        :style="styleObject"
      />
    </a>

    <!-- ホームページ専用メニュー項目（中央ロゴの下） -->
    <nav class="home-nav-links" ref="homeNavRef" v-show="isHomePage && introComplete">
        <RouterLink to="/about" class="home-nav-link">{{ $t('navbar.menu.about') }}</RouterLink>
        <RouterLink to="/creatives" class="home-nav-link">{{
          $t('navbar.menu.creatives')
        }}</RouterLink>
        <RouterLink to="/contact" class="home-nav-link">{{ $t('navbar.menu.contact') }}</RouterLink>

        <!-- 言語切り替えドロップダウン -->
        <LanguageDropdown
          ref="langDropdownHome"
          variant="home"
          :is-open="isDropdownOpen"
          :current-label="currentLanguageLabel"
          :languages="languages"
          :current-locale="locale"
          :ariaLabel="$t('navbar.selectLanguage')"
          @toggle="toggleDropdown"
          @select="selectLanguage"
          @close="isDropdownOpen = false"
        />
      </nav>

    <div class="app glass" :class="{ hidden: isHomePage }" :style="appStyles">
      <router-view v-slot="{ Component }" :key="$route.fullPath">
        <Suspense>
          <template #default>
            <transition name="slide" mode="out-in">
              <component :is="Component" id="scrollable-aria" />
            </transition>
          </template>
          <template #fallback>
            <div class="loading-placeholder">Loading...</div>
          </template>
        </Suspense>
      </router-view>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted, computed, ref, type CSSProperties } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Menu from '@/components/Menu.vue';
import LanguageDropdown from '@/components/LanguageDropdown.vue';
import logoSvg from '@/assets/logo.svg';
import { useLanguageSwitcher } from '@/composables/useLanguageSwitcher';
import { useIntroAnimation } from '@/composables/useIntroAnimation';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const isHomePage = ref<boolean>(true);

// テンプレート ref（vue-tsc がテンプレート参照を追跡するためコンポーネント側で宣言）
const splashOverlayRef = ref<HTMLDivElement | null>(null);
const splashLogoRef = ref<HTMLImageElement | null>(null);
const centerLogoRef = ref<HTMLImageElement | null>(null);
const homeNavRef = ref<HTMLElement | null>(null);

// 言語ドロップダウン ref（LanguageDropdown expose経由）
const langDropdownHome = ref<InstanceType<typeof LanguageDropdown> | null>(null);

// 言語切替 composable
const {
  locale,
  languages,
  isDropdownOpen,
  currentLanguageLabel,
  toggleDropdown,
  selectLanguage,
} = useLanguageSwitcher(() => [langDropdownHome.value?.rootRef ?? null]);

// イントロアニメーション composable
const {
  showSplash,
  introComplete,
  revealComplete,
  initAnimation,
  skipIntroIfNeeded,
} = useIntroAnimation({ isHomePage, splashOverlayRef, splashLogoRef, centerLogoRef, homeNavRef });

const checkRouterReady = async (): Promise<void> => {
  await router.isReady();
  updateHomePageState();
};

// リアクティブなスタイル計算（transform使用でCLS回避）
const appStyles = computed<CSSProperties>(() => {
  if (isHomePage.value) {
    return {
      opacity: '0',
      pointerEvents: 'none',
      visibility: 'hidden',
      transform: 'translateY(20vh)',
    };
  } else {
    return {
      opacity: '1',
      pointerEvents: 'all',
      visibility: 'visible',
      transform: 'translateY(0)',
    };
  }
});

const updateHomePageState = (): void => {
  isHomePage.value = route.name === 'home';
};

// <html lang> を locale と同期（WCAG 3.1.1対応）
watch(locale, (newLocale) => {
  document.documentElement.lang = newLocale;
}, { immediate: true });

watch(route, () => {
  updateHomePageState();
  skipIntroIfNeeded();
});

onMounted(async () => {
  await checkRouterReady();
  initAnimation();
});

const path = computed<string>(() => route.path);

const className = computed<string>(() => {
  if (path.value === '/') {
    return 'route-home';
  } else {
    return 'route-other';
  }
});

const styleObject = computed<CSSProperties>(() => {
  if (path.value === '/') {
    if (!introComplete.value || !revealComplete.value) {
      return { opacity: '0', transition: 'none' };
    }
    return { transition: 'all .4s ease-in-out' };
  } else {
    return {
      opacity: '0',
      filter: 'blur(2rem)',
      transition: 'all .4s ease-in-out',
    };
  }
});
</script>

<style scoped>
#main {
  position: relative;
  width: 100%;
  height: 100%;
}
.home-logo {
  pointer-events: all;
  z-index: 1;
  overflow-y: hidden;
}
/* スプラッシュオーバーレイ */
.splash-overlay {
  position: fixed;
  inset: 0;
  background-color: #f0d300;
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  will-change: transform;
}
.splash-logo {
  width: min(75vw, 700px);
  height: auto;
  opacity: 0;
  will-change: opacity, transform;
}
#center-logo {
  position: absolute;
  top: 43%;
  left: 50%;
  width: min(75vw, 700px);
  height: auto;
  aspect-ratio: 800 / 200;
  transform: translate(-50%, -50%);
  transition: all 0.5s ease-in-out;
}
#sp-nav {
  display: none;
}
.route-home {
  opacity: 1;
  transition: all 0.4s ease-in-out;
}
.route-other {
  opacity: 0;
  filter: blur(2rem);
  transition: all 0.4s ease-in-out;
}
.hidden {
  visibility: hidden;
  opacity: 0 !important;
}
.app {
  min-width: 85vw;
  max-width: 1280px;
  max-height: 82vh; /* デスクトップ */
  margin: 0 auto;
  padding: 0.5rem;
  border-radius: 10px;
  transition: opacity 0.5s ease-in-out, visibility 0.5s ease-in-out, transform 0.5s ease-in-out;
  will-change: opacity, transform;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: transparent;
  z-index: 10;
}
.glass {
  /* 背景を少し強めてコントラストを確保 */
  background-color: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.4); /* ボーダー */
  border-right-color: rgba(255, 255, 255, 0.2);
  border-bottom-color: rgba(255, 255, 255, 0.2);
  border-radius: 28px;
  -webkit-backdrop-filter: blur(20px); /* ぼかしエフェクト */
  backdrop-filter: blur(20px);
  box-shadow:
    0 10px 28px rgba(0, 0, 0, 0.14),
    0 1px 4px rgba(0, 0, 0, 0.06); /* 柔らかい二段影 */
  color: #111; /* ガラス上のテキストは濃色で可読性を担保 */
  z-index: 10;
}
#scrollable-aria {
  scrollbar-width: thin;
  -webkit-overflow-scrolling: touch;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: transparent;
  z-index: 10;
  pointer-events: all;
}
::-webkit-scrollbar {
  overflow: scroll;
}
.slide-enter {
  transform: translateX(-2%);
  opacity: 0;
}
.slide-leave-to {
  transform: translateX(2%);
  opacity: 0;
}
.slide-enter-active {
  animation: slide-in 0.5s cubic-bezier(0.25, 0.1, 0.25, 1);
}
.slide-leave-active {
  animation: slide-out 0.4s cubic-bezier(0.4, 0, 1, 1);
}

@keyframes slide-in {
  0% {
    transform: translateX(2%);
    opacity: 0;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slide-out {
  0% {
    transform: translateX(0);
    opacity: 1;
  }
  100% {
    transform: translateX(-2%);
    opacity: 0;
  }
}

/* ナビゲーション視覚フィードバックシステム */
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: transparent;
  z-index: 10;
  display: none;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #f0d300, #ff984f, #f0d300);
  background-size: 200% 100%;
  animation: gradient-wave 1.5s ease-in-out infinite;
  border-radius: 0 2px 2px 0;
  box-shadow: 0 0 10px rgba(240, 211, 0, 0.6);
  transition: width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

@keyframes gradient-wave {
  0% {
    background-position: 200% 50%;
  }
  100% {
    background-position: -200% 50%;
  }
}

/* ナビゲーション中のローディング状態 */
:global(.navigation-loading) {
  cursor: wait !important;
}

:global(.navigation-loading *) {
  cursor: wait !important;
}

/* ナビゲーションリンクのローディングフィードバック */
:global(.navigation-loading .rlink) {
  opacity: 0.7;
  transform: scale(0.98);
  transition: all 0.2s ease-in-out;
}

/* ローディングプレースホルダー */
.loading-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 1.2rem;
  color: rgba(17, 17, 17, 0.7);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}

/* SpNav 強制有効化（親要素のpointer-events制限を上書き） */
#sp-nav,
#sp-nav * {
  pointer-events: auto !important;
}

/* SP表示 */
@media (max-width: 540px) {
  #main {
    display: block;
    pointer-events: none;
  }
  #center-logo {
    top: calc(32% + env(safe-area-inset-top, 0rem));
    width: min(80vw, 400px);
  }
  .splash-logo {
    width: min(85vw, 400px);
  }
  .app {
    margin: .5rem 0;
    width: 100%;
    max-height: 77vh;
  }

  /* SP用プログレスバー */
  .progress-bar {
    height: 4px;
  }
}

/* ホームページ専用メニュー項目（中央ロゴの下） */
.home-nav-links {
  position: absolute;
  top: 55%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  justify-content: center;
  flex-wrap: nowrap; /* 明示的にデフォルト設定 */
  gap: 3rem;
  z-index: 1;
  pointer-events: auto;
}

.home-nav-link {
  text-decoration: none;
  color: #000;
  font-size: 1.3rem;
  font-weight: bold;
  padding: 0.5rem 1rem;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
  white-space: nowrap;
}

/* タッチデバイスではホバー効果を無効化 */
@media (hover: hover) and (pointer: fine) {
  .home-nav-link:hover {
    color: #d7a800;
    text-shadow: #f0d300 0 0px 1rem;
    animation: glow 0.3s ease-in-out infinite alternate;
  }
}

/* メニュー項目間の縦線（最後のリンクにも適用） */
.home-nav-link::after {
  content: '|';
  position: absolute;
  right: -1.5rem;
  color: #666;
  font-weight: normal;
  user-select: none;
}

/* ホームメニューフェードアニメーション */
.home-menu-fade-enter-active,
.home-menu-fade-leave-active {
  transition:
    opacity 0.4s ease,
    filter 0.4s ease;
}

.home-menu-fade-leave-active {
  pointer-events: none; /* 退場アニメーション中はイベント受信を完全遮断 */
}

.home-menu-fade-enter-from {
  opacity: 0;
}

.home-menu-fade-leave-to {
  opacity: 0;
  filter: blur(2rem);
}

/* レスポンシブ対応 - 3段階ブレークポイント */

/* Desktop: 769px以上 - ホームメニュー表示（一行レイアウト） */
@media screen and (min-width: 769px) {
  .home-nav-links {
    display: flex; /* 常に表示、改行しない */
    flex-wrap: nowrap;
    gap: 3rem;
    top: 55%;
  }
}

/* Tablet: 541px - 768px - メニューリンク一行 + 言語ボタン中央配置 */
@media screen and (max-width: 768px) and (min-width: 541px) {
  .app {
    max-height: 77vh;
  }
  .home-nav-links {
    top: 56%;
    flex-wrap: wrap; /* 二段表示（言語ボタンのみ） */
    gap: 0.5rem; /* リンク間隔をさらに削減 */
    row-gap: 1.5rem; /* 行間を拡大 */
    max-width: 95vw; /* 最大幅を拡大 */
    justify-content: center; /* センタリング */
  }

  .home-nav-link {
    font-size: 1rem; /* フォントサイズをさらに削減 */
    padding: 0.3rem 0.6rem; /* パディングをさらに削減 */
    flex-shrink: 0; /* 縮小禁止 */
    white-space: nowrap; /* 改行禁止 */
  }

  /* 全ての縦線を削除（一行表示のため） */
  .home-nav-link::after {
    content: none;
  }
}

/* Mobile: 540px以下 - 縦積みレイアウト */
@media screen and (max-width: 540px) {
  .home-nav-links {
    display: flex;
    flex-direction: column; /* 垂直スタック */
    flex-wrap: nowrap;
    align-items: center; /* 水平中央揃え */
    gap: 0.75rem; /* 項目間の縦間隔 */
    top: calc(42% + env(safe-area-inset-top, 0rem)); /* ロゴから少し下げる */
    max-width: 90vw; /* 画面幅の90%まで使用 */
    padding: 0 1rem;
    padding-bottom: max(1.5rem, env(safe-area-inset-bottom, 1.5rem)); /* Safe Area対応 */
  }

  /* リンクスタイル - タッチフレンドリー */
  .home-nav-link {
    font-size: 1.1rem; /* 可読性確保 */
    padding: 0.5rem 1.2rem; /* タッチターゲット拡大 */
    width: 100%; /* 全幅表示 */
    text-align: center;
    max-width: 280px; /* iPhone SE対応 */
    min-height: 44px; /* iOS推奨タッチサイズ */
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    white-space: nowrap;
  }

  /* 縦線を完全削除 */
  .home-nav-link::after {
    content: none;
    display: none;
  }
}

/* iPhone SE (375px x 667px) 等の超小型デバイス対応 */
@media screen and (max-width: 540px) and (max-height: 700px) {
  #center-logo {
    width: min(75vw, 350px);
  }

  .home-nav-links {
    top: calc(40% + env(safe-area-inset-top, 0rem));
    gap: 0.5rem;
  }

  .home-nav-link {
    font-size: 1rem;
    padding: 0.4rem 1rem;
    min-height: 40px;
  }
}
</style>
