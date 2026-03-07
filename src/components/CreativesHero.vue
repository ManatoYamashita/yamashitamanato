<template>
  <section class="hero-section">
    <div class="hero-content">
      <div class="hero-text">
        <h1>Creatives <span>based on</span> <span class="highlight">Design</span></h1>
        <p class="hero-description">{{ $t('creatives.paragraph') }}</p>

        <!-- カテゴリフィルターボタン -->
        <div class="category-filters" role="toolbar" :aria-label="$t('creatives.filters.toolbar')">
          <button
            @click="setFilter('all')"
            :class="['filter-tag', { active: activeFilter === 'all' }]"
            :aria-pressed="activeFilter === 'all'"
            :aria-label="$t('creatives.filters.all')"
          >
            <font-awesome-icon :icon="faTableCells" class="tag-icon" />
            <span>All</span>
          </button>
          <button
            @click="setFilter('animation')"
            :class="['filter-tag', { active: activeFilter === 'animation' }]"
            :aria-pressed="activeFilter === 'animation'"
            :aria-label="$t('creatives.filters.animation')"
          >
            <font-awesome-icon :icon="faFilm" class="tag-icon" />
            <span>Anime</span>
          </button>
          <button
            @click="setFilter('development')"
            :class="['filter-tag', { active: activeFilter === 'development' }]"
            :aria-pressed="activeFilter === 'development'"
            :aria-label="$t('creatives.filters.development')"
          >
            <font-awesome-icon :icon="faCode" class="tag-icon" />
            <span>Dev</span>
          </button>
          <button
            @click="setFilter('illustration')"
            :class="['filter-tag', { active: activeFilter === 'illustration' }]"
            :aria-pressed="activeFilter === 'illustration'"
            :aria-label="$t('creatives.filters.illustration')"
          >
            <font-awesome-icon :icon="faPalette" class="tag-icon" />
            <span>Illust</span>
          </button>
          <button
            @click="setFilter('video')"
            :class="['filter-tag', { active: activeFilter === 'video' }]"
            :aria-pressed="activeFilter === 'video'"
            :aria-label="$t('creatives.filters.video')"
          >
            <font-awesome-icon :icon="faVideo" class="tag-icon" />
            <span>Video</span>
          </button>
          <button
            @click="setFilter('design')"
            :class="['filter-tag', { active: activeFilter === 'design' }]"
            :aria-pressed="activeFilter === 'design'"
            :aria-label="$t('creatives.filters.design')"
          >
            <font-awesome-icon :icon="faPencilAlt" class="tag-icon" />
            <span>Design</span>
          </button>
        </div>
      </div>
      <div class="hero-visual">
        <div class="sphere-container">
          <div class="sphere"></div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import {
  faTableCells,
  faFilm,
  faCode,
  faPalette,
  faVideo,
  faPencilAlt,
} from '@fortawesome/free-solid-svg-icons';

// フィルター状態管理
const activeFilter = ref('all');

// Emit定義
const emit = defineEmits(['filter-change']);

// フィルター設定関数
const setFilter = (category: string): void => {
  activeFilter.value = category;
  emit('filter-change', category); // 親コンポーネント（Creatives.vue）に通知
};

// GSAP timeline 参照（クリーンアップ用）
let tl: gsap.core.Timeline | null = null;

onMounted(async () => {
  // reduced-motion: アニメーションをスキップ
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // GSAPを動的インポートして初期バンドルサイズを削減
  const { gsap } = await import('gsap');

  // Hero セクションのアニメーション
  tl = gsap.timeline();

  tl.fromTo(
    '.hero-text h1',
    {
      y: 50,
      opacity: 0,
    },
    {
      y: 0,
      opacity: 1,
      duration: 1,
      ease: 'power3.out',
    }
  )
    .fromTo(
      '.hero-description',
      {
        y: 30,
        opacity: 0,
      },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: 'power3.out',
      },
      '-=0.7'
    )
    .fromTo(
      '.cta-button',
      {
        y: 20,
        opacity: 0,
      },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: 'power3.out',
      },
      '-=0.7'
    )
    .fromTo(
      '.sphere',
      {
        scale: 0.5,
        opacity: 0,
      },
      {
        scale: 1,
        opacity: 1,
        duration: 1.5,
        ease: 'elastic.out(1, 0.3)',
      },
      '-=0.8'
    );
});

onUnmounted(() => {
  tl?.kill();
  tl = null;
});
</script>

<style scoped>
/* Hero セクションのスタイル */
.hero-section {
  width: 100%;
  padding: 3rem 0;
  margin-bottom: 3rem;
  /* min-height: 100svh; */
}

.hero-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.hero-text {
  flex: 1.5;
  position: relative;
  z-index: 10; /* テキストとドロップダウンメニューのz-indexを上げる */
}

.hero-text h1 {
  font-size: 2.8rem;
  line-height: 1.2;
  margin-bottom: 1.5rem;
  font-weight: 800;

  /* ShinyText: グラデーションシャイン効果 */
  background-image: linear-gradient(
    120deg,
    #1a1a1a 0%,
    #1a1a1a 35%,
    #888 50%,
    #1a1a1a 65%,
    #1a1a1a 100%
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shine 3s linear infinite;
}

.hero-text h1 span {
  display: inline-block;
}

.hero-text h1 .highlight {
  -webkit-text-fill-color: transparent;
  background-image: linear-gradient(
    120deg,
    #f0d300 0%,
    #f0d300 35%,
    #fff8b0 50%,
    #f0d300 65%,
    #f0d300 100%
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  animation: shine 3s linear infinite;
  position: relative;
}

@keyframes shine {
  from { background-position: 150% center; }
  to   { background-position: -50% center; }
}

.hero-description {
  font-size: 1.2rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  max-width: 600px;
  color: #333;
}

/* カテゴリフィルターボタン */
.category-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-start;
  margin-top: 2rem;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.2rem;
  background: transparent;
  border: 2px solid #000;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #000;
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-tag:hover {
  background: #000;
  border-color: #000;
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.filter-tag.active {
  background: #000;
  border-color: #000;
  color: #fff;
  font-weight: 700;
}

.tag-icon {
  font-size: 1rem;
}

.hero-visual {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 1;
}

.sphere-container {
  position: relative;
  width: 250px;
  height: 250px;
  perspective: 800px;
}

.sphere {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffffff 0%, #e6f7ff 100%);
  box-shadow:
    inset -20px -20px 60px rgba(67, 153, 187, 0.3),
    inset 20px 20px 60px rgba(255, 255, 255, 0.8),
    0 0 30px rgba(67, 153, 187, 0.2);
  transform-style: preserve-3d;
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) rotateY(0);
  }
  50% {
    transform: translateY(-20px) rotateY(20deg);
  }
}

/* レスポンシブデザイン */
@media (max-width: 1024px) {
  .hero-section {
    padding: 1rem;
  }
  .hero-content {
    flex-direction: column;
    text-align: center;
  }

  .hero-text h1 {
    font-size: 2.4rem;
  }

  .hero-description {
    margin: 0 auto 2rem auto;
  }

  .sphere-container {
    width: 200px;
    height: 200px;
  }

  .category-filters {
    justify-content: center;
  }
}

@media (max-width: 540px) {
  .hero-section {
    padding: 2rem 1rem;
  }

  .hero-text h1 {
    font-size: 2rem;
  }

  .sphere-container {
    width: 150px;
    height: 150px;
  }

  /* 要素順序: h1 → sphere → p → filters（モバイル時） */
  .hero-content {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-areas:
      'title'
      'sphere'
      'desc'
      'filters';
    justify-items: center;
    text-align: center;
    gap: 1.25rem;
  }

  /* .hero-text をフラット化して子要素をグリッドアイテム化 */
  .hero-text {
    display: contents;
  }

  .hero-text h1 {
    grid-area: title;
    margin-bottom: 0.25rem;
  }

  .hero-visual {
    grid-area: sphere;
  }

  .hero-description {
    grid-area: desc;
    margin: 0 0 0.5rem 0;
  }

  .category-filters {
    grid-area: filters;
    margin-top: 0.25rem;
    gap: 0.5rem;
    justify-content: center;
  }

  .filter-tag {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
  }

  .tag-icon {
    font-size: 0.9rem;
  }
}
</style>
