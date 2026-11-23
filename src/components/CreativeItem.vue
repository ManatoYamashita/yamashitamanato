<template>
  <!-- Card mode: カード形式のレイアウト -->
  <li
    ref="itemRef"
    :class="`creative-item creative-item--${mode.toLowerCase()}`"
    :data-creative-index="index"
  >
    <router-link :to="`/creatives/${category}/${id}`">
      <div class="img-cover">
        <!-- YouTube iFrame表示（youtubeUrlがある場合） -->
        <div v-if="youtubeUrl" class="video-container">
          <iframe
            :src="youtubeUrl"
            :title="title"
            allow="
              accelerometer;
              autoplay;
              clipboard-write;
              encrypted-media;
              gyroscope;
              picture-in-picture;
            "
            allowfullscreen
            loading="lazy"
          ></iframe>
        </div>
        <!-- 通常の画像表示 -->
        <img
          v-else
          :src="resolvedThumbnail"
          :srcset="thumbnailSrcset"
          :sizes="thumbnailSizes"
          :alt="title"
          width="1280"
          height="720"
          loading="lazy"
          @error="handleImageError"
        />
      </div>
      <h3>{{ title }} <font-awesome-icon :icon="faArrowRight" class="fa" /></h3>

      <!-- タグ表示（Card modes） -->
      <div class="creative-tags" v-if="tags && tags.length > 0">
        <span v-for="tag in tags" :key="tag" class="creative-tag">
          {{ tag }}
        </span>
      </div>
    </router-link>
  </li>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { getMicroCMSSrcset } from '@/composables/useCreativesAPI';
import type { CreativeCategory } from '@/types';

interface Props {
  category: CreativeCategory;
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  index: number;
  mode: 'Animation' | 'Development' | 'Illustration' | 'Video' | 'Graphic';
  tags?: string[];
  youtubeUrl?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  tags: () => [],
  youtubeUrl: null,
});

// サムネイル画像パスを解決
const resolvedThumbnail = computed<string>(() => {
  try {
    if (props.thumbnail.startsWith('@/')) {
      return new URL(props.thumbnail, import.meta.url).href;
    }
    return props.thumbnail;
  } catch {
    return 'https://via.placeholder.com/300x200?text=Image+Not+Found';
  }
});

// Illustration 以外のカードは .img-cover（aspect-ratio: 16/9）に object-fit: cover で
// 切り抜いて表示する。16:9 より縦長な原画は上下が見えないため、配信段階で同じ中央位置を
// 切り落としておく（cropAspect、詳細は getOptimizedImageUrl）。Illustration は高さが
// 原画の縦横比に依存する（height: auto + max-height）ため、トリミングせず縦横比を保つ。
const isIllustration = computed<boolean>(() => props.mode === 'Illustration');

// Illustration 枠は PC で幅 988px あり、DPR 2 では 2000px の候補が選ばれる。
// 掲載中のイラストはアニメーション WebP（84 フレーム）で、2000px 指定だと約 2.2MB になる。
// 枠は高さ 250px で上下が切り抜かれるため、変更前の上限（1200px・約 1.5MB）と
// 同程度の 1280px（約 1.6MB）で止める。
const ILLUSTRATION_MAX_WIDTH = 1280;

// レスポンシブ画像用の srcset 生成（microCMS画像でない場合は空文字）
const thumbnailSrcset = computed<string>(() =>
  getMicroCMSSrcset(
    resolvedThumbnail.value,
    isIllustration.value ? { maxWidth: ILLUSTRATION_MAX_WIDTH } : { cropAspect: 16 / 9 }
  )
);

// レスポンシブ画像用の sizes 属性。Creatives.vue のグリッドで実測した <img> の表示幅に合わせる。
//   86px = body 左右 16px + .app 左右 8px と枠線 1px + .creatives 左右 16px + .img-cover 枠線 2px（各×2）
//   〜480px: 1列 / 481〜768px: 2列（gap 1rem）/ 769px〜: 3列（gap 1rem）
//   1074px 以上は .creatives の max-width: 1024px で頭打ち（カード 316px、1列枠 988px）
// レイアウト側の余白や列数を変えたら、この値も実測し直すこと。
const CARD_SIZES =
  '(max-width: 480px) calc(100vw - 86px), (max-width: 768px) calc(50vw - 53px), (max-width: 1074px) calc(33.4vw - 42px), 316px';
const ILLUSTRATION_SIZES = '(max-width: 1074px) calc(100vw - 86px), 988px';
const thumbnailSizes = computed<string>(() =>
  isIllustration.value ? ILLUSTRATION_SIZES : CARD_SIZES
);

const handleImageError = (e: Event): void => {
  const target = e.target as HTMLImageElement;
  target.src = 'https://via.placeholder.com/300x200?text=Image+Not+Found';
};

// IntersectionObserver による遅延読み込み最適化
const itemRef = ref<HTMLElement | null>(null);
const isVisible = ref(false);

let observer: IntersectionObserver | null = null;

onMounted(() => {
  if (itemRef.value) {
    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          isVisible.value = true;
          observer?.disconnect(); // 一度表示されたら監視を終了
        }
      },
      { rootMargin: '50px' } // 50px手前で読み込み開始
    );
    observer.observe(itemRef.value);
  }
});

onUnmounted(() => {
  observer?.disconnect();
});
</script>

<style scoped>
/* カード形式の基本スタイル */
.creative-item {
  margin: 1rem 0;
  overflow: hidden;
  opacity: 1;
  transform: translateY(0px);
}

.img-cover {
  overflow: hidden;
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 0.5rem;
  border: 2px solid #000; /* 黒の2pxボーダー */
  transition: border-color 0.3s ease;
}

.img-cover:hover {
  border-color: #f0d300; /* ホバー時にbrand colorに変更 */
}

.img-cover img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0.5rem;
  transition: transform 0.5s cubic-bezier(0.075, 0.82, 0.165, 1);
}

.img-cover:hover img {
  transform: scale(1.1);
}

/* YouTube iFrame用のコンテナ */
.video-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 0.5rem;
  overflow: hidden;
}

.video-container iframe {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 0.5rem;
}

.fa {
  font-size: 0.8rem;
}

h3 {
  font-size: 1.2rem;
  margin: 0.5rem 0;
}

a {
  text-decoration: none;
  color: rgb(10, 10, 10);
}

a:hover {
  color: #000; /* グローバルルールと統一 */
  text-shadow: 0 0 8px rgba(240, 211, 0, 0.7);
  text-decoration: underline;
  text-decoration-color: rgba(240, 211, 0, 0.8);
  text-underline-offset: 0.2em;
}

/* Illustration mode専用の画像制限 */
.creative-item--illustration .img-cover {
  height: auto;
  max-height: 250px;
  padding-top: 0;
  border: 2px solid #000; /* 黒の2pxボーダー */
  transition: border-color 0.3s ease;
}

.creative-item--illustration .img-cover:hover {
  border-color: #f0d300; /* ホバー時にbrand colorに変更 */
}

.creative-item--illustration .img-cover img {
  position: static;
  width: 100%;
  max-height: 250px;
  height: auto;
  object-fit: cover;
  transition: transform 0.5s cubic-bezier(0.075, 0.82, 0.165, 1);
}

@media screen and (max-width: 768px) {
  .fa {
    font-size: 0.8rem;
  }
  h3 {
    font-size: 1.1rem;
  }
}

/* タグスタイリング（共通） */
.creative-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.8rem;
}

.creative-tag {
  display: inline-block;
  padding: 0.35rem 0.8rem;
  background: transparent;
  border: 1.5px solid #000;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #000;
  transition: all 0.3s ease;
}

.creative-tag:hover {
  background: #000;
  border-color: #000;
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

@media screen and (max-width: 967px) {
  /* モバイルでタグサイズを縮小 */
  .creative-tag {
    padding: 0.3rem 0.7rem;
    font-size: 0.7rem;
  }
}

@media screen and (max-width: 540px) {
  .creative-tags {
    gap: 0.4rem;
    margin-top: 0.6rem;
  }

  .creative-tag {
    padding: 0.25rem 0.6rem;
    font-size: 0.65rem;
  }
}
</style>
