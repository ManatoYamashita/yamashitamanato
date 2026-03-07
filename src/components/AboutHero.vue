<template>
  <section id="about-hero" class="profile-card">
    <div class="profile-layout">
      <!-- 画像 -->
      <div class="profile-image-container">
        <img
          fetchpriority="high"
          :src="imageSrc"
          :alt="imageAlt"
          width="300"
          height="300"
          class="profile-image"
        />
      </div>

      <!-- 右側コンテンツ -->
      <div class="profile-right-content">
        <!-- 名前・読み仮名 -->
        <header class="profile-info">
          <div class="name-section">
            <h1 class="profile-name">{{ t('about.ym') }}</h1>
            <a
              :href="externalProfileUrl"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="t('about.externalProfileLabel')"
              class="external-link-icon"
            >
              <font-awesome-icon :icon="faArrowUpRightFromSquare" />
            </a>
          </div>
          <p class="profile-reading">{{ t('about.reading') }}</p>
        </header>

        <!-- メッセージ -->
        <section class="message-section">
          <h2 class="section-title">{{ t('about.howyoufeel') }}</h2>
          <p class="message-text">{{ t('about.passage') }} &#x1F34C;</p>
        </section>
      </div>
    </div>

    <!-- アクション -->
    <div class="profile-actions">
      <div class="sns-container">
        <Sns />
      </div>
      <Cta :to="'/contact'" :text="t('about.ctaText')" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Locale } from '@/types';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import Sns from '@/components/Sns.vue';
import Cta from '@/components/Cta.vue';

const { t, locale } = useI18n<{ message: string }, Locale>();

// 画像パスの配列
const imageOptions = ['/山下真和都(マナト).webp', '/山下真和都(マナト)2.webp'];

// ランダムに画像を選択
const imageSrc = imageOptions[Math.floor(Math.random() * imageOptions.length)];
const externalProfileUrl = 'https://bento.me/ym/';

const imageAlt = computed(() =>
  locale.value === 'ja' ? '山下真和都(マナト)' : 'Manato Yamashita'
);

// GSAP tween 参照（クリーンアップ用）
let tweens: gsap.core.Tween[] = [];

onMounted(async () => {
  // GSAPを動的インポートして初期バンドルサイズを削減
  const { gsap } = await import('gsap');

  tweens = [
    // 1. 画像（0.0s）
    gsap.from('.profile-image', {
      scale: 0.8,
      opacity: 0,
      duration: 1,
      ease: 'power2.out',
    }),

    // 2. 名前セクション（0.2s）
    gsap.from('.name-section', {
      opacity: 0,
      y: -20,
      duration: 0.8,
      delay: 0.2,
      ease: 'power2.out',
    }),

    // 3. 読み仮名（0.4s）
    gsap.from('.profile-reading', {
      opacity: 0,
      y: 10,
      duration: 0.6,
      delay: 0.4,
      ease: 'power2.out',
    }),

    // 4. メッセージ（0.5s）
    gsap.from('.message-section', {
      opacity: 0,
      y: 30,
      duration: 1,
      delay: 0.5,
      ease: 'power2.out',
    }),

    // 5. CTAボタン（0.7s）
    gsap.from('.learn-more', {
      opacity: 0,
      scale: 0.9,
      duration: 0.8,
      delay: 0.7,
      ease: 'back.out(1.4)',
      clearProps: 'opacity',
    }),
  ];

  // 6. SNSアイコン（Sns.vue内のstagger維持）
});

onUnmounted(() => {
  tweens.forEach(t => t.kill());
  tweens = [];
});
</script>

<style scoped>
/* === ベーススタイル（モバイル: ~480px） === */
#about-hero {
  width: 100%;
}

.profile-card {
  display: flex;
  flex-direction: column;
}

/* レイアウトコンテナ */
.profile-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* 画像 */
.profile-image-container {
  width: 100%;
  max-width: none;
  max-height: 40vh;
  overflow: hidden;
  border-radius: 1.5rem 1.5rem 0 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  margin: 0;
}

.profile-image {
  width: 100%;
  height: 100%;
  border-radius: 1.5rem 1.5rem 0 0;
  object-fit: cover;
}

/* 右側コンテンツ */
.profile-right-content {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  padding: 0 1rem;
}

/* プロフィール情報 */
.profile-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}

.name-section {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.profile-name {
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;

  /* ShinyText: グラデーションシャイン効果 */
  background-image: linear-gradient(
    120deg,
    #111 0%,
    #111 35%,
    #888 50%,
    #111 65%,
    #111 100%
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shine 3s linear infinite;
}

@keyframes shine {
  from {
    background-position: 150% center;
  }
  to {
    background-position: -50% center;
  }
}

.external-link-icon {
  color: #666;
  transition:
    color 0.3s ease,
    transform 0.3s ease;
  display: flex;
  align-items: center;
  text-decoration: none;
}

.external-link-icon:hover {
  color: #f0d300;
  transform: translateY(-2px);
}

.profile-reading {
  font-size: 1rem;
  color: #666;
  margin: 0;
}

/* メッセージセクション */
.message-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #111;
  margin: 0;
}

.message-text {
  font-size: 1rem;
  line-height: 1.6;
  color: #333;
  margin: 0;
  white-space: pre-line;
}

/* アクション */
.profile-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  margin: 3rem 0;
}

.sns-container {
  width: 100%;
  display: flex;
  justify-content: center;
}

/* === タブレット（541px-768px） === */
@media screen and (min-width: 541px) and (max-width: 768px) {
  .profile-image-container {
    max-width: 300px;
    max-height: 300px;
    aspect-ratio: 1 / 1;
    border-radius: 1.5rem 1.5rem 0 0;
  }

  .profile-image {
    border-radius: 1.5rem 1.5rem 0 0;
  }
}

/* === デスクトップ（769px~） === */
@media screen and (min-width: 769px) {
  #about-hero {
    padding: 3rem 0;
  }

  .profile-layout {
    flex-direction: row;
    gap: 3rem;
  }

  .profile-image-container {
    width: 30%;
    max-width: 350px;
    max-height: 350px;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    flex-shrink: 1;
    margin: 0;
    overflow: hidden;
    align-self: flex-start;
  }

  .profile-image {
    border-radius: 50%;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .profile-right-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .profile-info {
    align-items: flex-start;
    text-align: left;
  }

  .profile-name {
    font-size: 2.5rem;
  }

  .profile-reading {
    font-size: 1.2rem;
  }

  .section-title {
    font-size: 1.5rem;
  }

  .message-text {
    font-size: 1.2rem;
    line-height: 1.6;
  }

  .profile-actions {
    flex-direction: row-reverse;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    width: 100%;
    margin-top: 2rem;
  }

  .sns-container {
    width: auto;
  }
}
</style>
