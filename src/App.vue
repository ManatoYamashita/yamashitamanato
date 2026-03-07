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
    <nav class="home-nav-links" ref="homeNavRef" v-if="isHomePage && introComplete">
        <RouterLink to="/about" class="home-nav-link">{{ $t('navbar.menu.about') }}</RouterLink>
        <RouterLink to="/creatives" class="home-nav-link">{{
          $t('navbar.menu.creatives')
        }}</RouterLink>
        <RouterLink to="/contact" class="home-nav-link">{{ $t('navbar.menu.contact') }}</RouterLink>

        <!-- 言語切り替えドロップダウン -->
        <div class="home-lang-dropdown" ref="dropdownRef">
          <button
            class="home-lang-dropdown-toggle"
            @click="toggleDropdown"
            :aria-expanded="isDropdownOpen"
            :aria-label="$t('navbar.selectLanguage')"
          >
            <font-awesome-icon :icon="faGlobe" class="globe-icon" />
            <span class="current-lang-label">{{ currentLanguageLabel }}</span>
            <font-awesome-icon
              :icon="faChevronDown"
              class="chevron-icon"
              :class="{ rotated: isDropdownOpen }"
            />
          </button>

          <transition name="dropdown-slide">
            <ul class="home-lang-dropdown-menu" v-show="isDropdownOpen">
              <li v-for="lang in languages" :key="lang.code">
                <button
                  @click="selectLanguage(lang.code)"
                  :class="{ active: locale === lang.code }"
                  class="home-lang-option-btn"
                >
                  <font-awesome-icon
                    :icon="faCheck"
                    class="check-icon"
                    v-show="locale === lang.code"
                  />
                  <span>{{ lang.label }}</span>
                </button>
              </li>
            </ul>
          </transition>
        </div>
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
import { watch, onMounted, onUnmounted, computed, ref, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faGlobe, faChevronDown, faCheck } from '@fortawesome/free-solid-svg-icons';
import Menu from '@/components/Menu.vue';
import type { Locale } from '@/types';
import logoSvg from '@/assets/logo.svg';

const route = useRoute();
const router = useRouter();
const { locale } = useI18n<{ message: string }, Locale>();
const isHomePage = ref<boolean>(true);
const introComplete = ref<boolean>(false);
const showSplash = ref<boolean>(true);
const splashOverlayRef = ref<HTMLDivElement | null>(null);
const splashLogoRef = ref<HTMLImageElement | null>(null);
const centerLogoRef = ref<HTMLImageElement | null>(null);
const homeNavRef = ref<HTMLElement | null>(null);
const revealComplete = ref<boolean>(false);

// 言語切り替えドロップダウン管理
const isDropdownOpen = ref<boolean>(false);
const dropdownRef = ref<HTMLElement | null>(null);

interface Language {
  code: Locale;
  label: string;
}

const languages: Language[] = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
];

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
  if (dropdownRef.value && !dropdownRef.value.contains(target)) {
    isDropdownOpen.value = false;
  }
};

const handleKeyDown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && isDropdownOpen.value) {
    isDropdownOpen.value = false;
  }
};

const checkRouterReady = async (): Promise<void> => {
  await router.isReady();
  updateHomePageState();
};

interface StyleObject extends Partial<Record<string, string>> {
  top?: string;
  opacity?: string;
  pointerEvents?: 'auto' | 'none' | 'all';
  filter?: string;
  transition?: string;
  transform?: string;
}

// リアクティブなスタイル計算（直接DOM操作を排除）
const appStyles = computed<StyleObject>(() => {
  if (isHomePage.value) {
    return {
      top: '20vh',
      opacity: '0',
      pointerEvents: 'none',
    };
  } else {
    return {
      top: '0',
      opacity: '1',
      pointerEvents: 'all',
    };
  }
});

const updateHomePageState = (): void => {
  isHomePage.value = route.name === 'home';
  // 直接DOM操作を削除 - リアクティブスタイルが自動更新
};

watch(route, () => {
  updateHomePageState();
  // ホームに戻った場合はイントロをスキップし、即座にナビリンク表示
  if (isHomePage.value && !introComplete.value) {
    introComplete.value = true;
    revealComplete.value = true;
  }
});

const playIntroAnimation = async (): Promise<void> => {
  if (introComplete.value || !splashOverlayRef.value || !splashLogoRef.value) {
    showSplash.value = false;
    introComplete.value = true;
    revealComplete.value = true;
    return;
  }

  const { gsap } = await import('gsap');
  const tl = gsap.timeline({
    onComplete: () => {
      showSplash.value = false;
      introComplete.value = true;

      void nextTick().then(() => {
        playRevealStagger(gsap);
      });
    },
  });

  // Phase 1: 黄色レイヤー上にロゴがフェードイン
  tl.fromTo(
    splashLogoRef.value,
    { opacity: 0, scale: 0.92 },
    { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' },
  )
  // Phase 2: ロゴフェードアウト → レイヤースライドアウト
  .to(splashLogoRef.value, {
    opacity: 0,
    duration: 0.3,
    ease: 'power2.in',
    delay: 0.3,
  })
  .to(splashOverlayRef.value, {
    yPercent: -100,
    duration: 0.7,
    ease: 'power3.inOut',
  });
  // Phase 3: onComplete でメイン画面（ロゴ+メニュー）stagger fade-down表示
};

const playRevealStagger = (gsap: typeof import('gsap').gsap): void => {
  const targets: Element[] = [];

  // 1. ロゴ
  if (centerLogoRef.value) {
    targets.push(centerLogoRef.value);
  }
  // 2. ナビリンク + 言語ドロップダウン（子要素を個別に）
  if (homeNavRef.value) {
    targets.push(...Array.from(homeNavRef.value.children));
  }

  if (targets.length === 0) return;

  // CSS transition を無効化してGSAPとの競合を防止
  // （.home-nav-link の transition: all 0.3s ease がGSAPの fromTo と干渉するため）
  targets.forEach((el) => {
    (el as HTMLElement).style.transition = 'none';
  });

  gsap.fromTo(
    targets,
    { opacity: 0, y: -30 },
    {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: 'power2.out',
      stagger: 0.12,
      onComplete: () => {
        // CSS transition を復元（ホバーエフェクト等に必要）
        targets.forEach((el) => {
          (el as HTMLElement).style.transition = '';
        });
        revealComplete.value = true;
      },
    },
  );
};

onMounted(async () => {
  await checkRouterReady();

  // ホームページならイントロアニメーション再生
  if (isHomePage.value) {
    playIntroAnimation();
  } else {
    showSplash.value = false;
    introComplete.value = true;
    revealComplete.value = true;
  }

  // 言語切り替えドロップダウンのイベントリスナー
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeyDown);
});

const path = computed<string>(() => route.path);

const className = computed<string>(() => {
  if (path.value === '/') {
    return 'route-home';
  } else {
    return 'route-other';
  }
});

const styleObject = computed<StyleObject>(() => {
  if (path.value === '/') {
    // GSAP reveal完了前: opacity:0 + transition:none でCSSの介入を完全に遮断
    if (!introComplete.value || !revealComplete.value) {
      return { opacity: '0', transition: 'none' };
    }
    // reveal完了後: CSS transitionで退場アニメーション等を担当
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
  display: contents;
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
  max-height: 77vh;
  margin: 0 auto;
  padding: 0.5rem;
  border-radius: 10px;
  transition: 0.5s ease-in-out;
  overflow-y: auto; /* スクロール可能に変更 */
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
    margin: 0;
    width: 100%;
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

  .home-lang-dropdown-toggle:hover {
    background: #f0d300;
    border-color: #d7a800;
    transform: translateY(-2px);
  }

  .home-lang-option-btn:hover {
    background: #f0d300;
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

/* 言語切り替えドロップダウン（ホームページ専用） */
.home-lang-dropdown {
  position: relative;
  z-index: 1;
  margin-left: 1.5rem; /* 縦線との間隔 */
}

.home-lang-dropdown-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #111; /* 1pxボーダー */
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
  color: #111;
  font-size: 1rem;
  white-space: nowrap;
}

.home-lang-dropdown .globe-icon {
  font-size: 1.2rem;
}

.home-lang-dropdown .current-lang-label {
  font-size: 1rem;
}

.home-lang-dropdown .chevron-icon {
  font-size: 0.8rem;
  transition: transform 0.3s ease;
}

.home-lang-dropdown .chevron-icon.rotated {
  transform: rotate(180deg);
}

.home-lang-dropdown-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 150px;
  background: #fff;
  border: 1px solid #111; /* 1pxボーダー */
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 0.5rem 0;
  z-index: 1;
  list-style: none;
  margin: 0;
}

.home-lang-option-btn {
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

.home-lang-option-btn.active {
  font-weight: bold;
  background: #fef9e0;
}

.home-lang-dropdown .check-icon {
  font-size: 0.9rem;
  color: #d7a800;
  flex-shrink: 0;
  width: 1rem;
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

  /* 言語ボタンを二段目の中央配置 */
  .home-lang-dropdown {
    margin-left: 0; /* リセット */
    margin-top: 0;
    flex-basis: 100%; /* 強制的に新しい行へ */
    width: 100%;
    display: flex;
    justify-content: center; /* 水平中央配置 */
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

  /* 言語ドロップダウンを最下段に配置 */
  .home-lang-dropdown {
    margin-left: 0;
    margin-top: 0.5rem;
    width: 100%;
    display: flex;
    justify-content: center;
    max-width: 280px;
  }

  /* 言語トグルボタン */
  .home-lang-dropdown-toggle {
    font-size: 0.95rem;
    padding: 0.5rem 1rem;
    min-height: 44px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* アイコンサイズ調整 */
  .home-lang-dropdown .globe-icon {
    font-size: 1.1rem;
  }

  .home-lang-dropdown .current-lang-label {
    font-size: 0.95rem;
  }

  .home-lang-dropdown .chevron-icon {
    font-size: 0.75rem;
  }

  /* ドロップダウンメニュー中央配置 */
  .home-lang-dropdown-menu {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    min-width: 180px;
    max-width: 90vw; /* 画面外回避 */
  }

  /* ドロップダウンオプションボタン */
  .home-lang-option-btn {
    font-size: 0.95rem;
    padding: 0.75rem 1.2rem;
    min-height: 44px;
  }
}

/* 言語ドロップダウン中央配置（541-768px） */
@media screen and (max-width: 768px) and (min-width: 541px) {
  .home-lang-dropdown-menu {
    right: auto;
    left: 50%;
    transform: translateX(-50%); /* ドロップダウンを中央配置 */
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

  .home-lang-dropdown-toggle {
    font-size: 0.9rem;
    padding: 0.4rem 0.9rem;
    min-height: 40px;
  }
}
</style>
