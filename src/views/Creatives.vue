<template>
  <main class="creatives">
    <CreativesHero @filter-change="handleFilterChange" />

    <div class="creatives-body">
      <div id="main-contents">
        <!-- 読み込み状態のライブリージョン。role="status" はテキスト更新より前から
             DOM に存在している必要があるため、内容が空でも常に描画する。 -->
        <div class="creatives-status" role="status" aria-live="polite">
          <template v-if="loadError">
            <p class="creatives-status__message">{{ $t('creatives.common.loadError') }}</p>
            <button type="button" class="creatives-status__retry" @click="load">
              <FontAwesomeIcon :icon="faRotateRight" class="tag-icon" />
              <span>{{ $t('creatives.common.retry') }}</span>
            </button>
          </template>
        </div>

        <!-- Animation Section -->
        <section v-if="activeFilter === 'all' || activeFilter === 'animation'" id="animation">
          <h2>Animation</h2>
          <p>{{ $t('creatives.animation.paragraph') }}</p>
          <ul v-if="!hasSettled && !animationCreatives.length">
            <li v-for="n in 1" :key="`sk-anim-${n}`" class="skeleton-card">
              <SkeletonBase aspect-ratio="16/9" border-radius="0.5rem" />
              <SkeletonBase width="70%" height="1.2rem" border-radius="0.25rem" style="margin-top: 0.5rem" />
              <div class="skeleton-tags"><SkeletonBase width="4rem" height="1.5rem" :rounded="true" /><SkeletonBase width="5rem" height="1.5rem" :rounded="true" /></div>
            </li>
          </ul>
          <ul v-else-if="animationCreatives.length">
            <CreativeItem
              v-for="(creative, index) in animationCreatives"
              :key="creative.id"
              :mode="'Animation'"
              :category="'animation'"
              :id="creative.id"
              :title="creative.title"
              :description="creative.description"
              :thumbnail="creative.thumbnail"
              :index="index"
              :tags="creative.tags"
              :youtubeUrl="creative.detail?.youtube?.desktop || null"
            />
          </ul>
          <p v-else-if="!loadError" class="section-empty">{{ $t('creatives.common.categoryEmpty') }}</p>
        </section>

        <!-- Development Section -->
        <section v-if="activeFilter === 'all' || activeFilter === 'development'" id="development">
          <h2>Development</h2>
          <p>{{ $t('creatives.dev.paragraph') }}</p>
          <ul v-if="!hasSettled && !randomizedDevelopment.length">
            <li v-for="n in 3" :key="`sk-dev-${n}`" class="skeleton-card">
              <SkeletonBase aspect-ratio="16/9" border-radius="0.5rem" />
              <SkeletonBase width="70%" height="1.2rem" border-radius="0.25rem" style="margin-top: 0.5rem" />
              <div class="skeleton-tags"><SkeletonBase width="4rem" height="1.5rem" :rounded="true" /><SkeletonBase width="5rem" height="1.5rem" :rounded="true" /></div>
            </li>
          </ul>
          <ul v-else-if="randomizedDevelopment.length">
            <CreativeItem
              v-for="(creative, index) in randomizedDevelopment"
              :key="creative.id"
              :category="'development'"
              :id="creative.id"
              :title="creative.title"
              :description="creative.description"
              :thumbnail="creative.thumbnail"
              :index="index"
              :mode="'Development'"
              :tags="creative.tags"
            />
          </ul>
          <p v-else-if="!loadError" class="section-empty">{{ $t('creatives.common.categoryEmpty') }}</p>
        </section>

        <!-- Illustration Section -->
        <section v-if="activeFilter === 'all' || activeFilter === 'illustration'" id="illustration">
          <h2>Illustration</h2>
          <p>{{ $t('creatives.illustration.paragraph') }}</p>
          <ul v-if="!hasSettled && !illustrationCreatives.length">
            <li v-for="n in 1" :key="`sk-illust-${n}`" class="skeleton-card">
              <SkeletonBase aspect-ratio="16/9" border-radius="0.5rem" />
              <SkeletonBase width="70%" height="1.2rem" border-radius="0.25rem" style="margin-top: 0.5rem" />
              <div class="skeleton-tags"><SkeletonBase width="4rem" height="1.5rem" :rounded="true" /><SkeletonBase width="5rem" height="1.5rem" :rounded="true" /></div>
            </li>
          </ul>
          <ul v-else-if="illustrationCreatives.length">
            <CreativeItem
              v-for="(creative, index) in illustrationCreatives"
              :key="creative.id"
              :category="'illustration'"
              :id="creative.id"
              :title="creative.title"
              :description="creative.description"
              :thumbnail="creative.thumbnail"
              :index="index"
              :mode="'Illustration'"
              :tags="creative.tags"
            />
          </ul>
          <p v-else-if="!loadError" class="section-empty">{{ $t('creatives.common.categoryEmpty') }}</p>
        </section>

        <!-- Video Section -->
        <section v-if="activeFilter === 'all' || activeFilter === 'video'" id="video">
          <h2>Video</h2>
          <p>{{ $t('creatives.video.paragraph') }}</p>
          <ul v-if="!hasSettled && !videoCreatives.length">
            <li v-for="n in 3" :key="`sk-video-${n}`" class="skeleton-card">
              <SkeletonBase aspect-ratio="16/9" border-radius="0.5rem" />
              <SkeletonBase width="70%" height="1.2rem" border-radius="0.25rem" style="margin-top: 0.5rem" />
              <div class="skeleton-tags"><SkeletonBase width="4rem" height="1.5rem" :rounded="true" /><SkeletonBase width="5rem" height="1.5rem" :rounded="true" /></div>
            </li>
          </ul>
          <ul v-else-if="videoCreatives.length">
            <CreativeItem
              v-for="(creative, index) in videoCreatives"
              :key="creative.id"
              :category="'video'"
              :id="creative.id"
              :title="creative.title"
              :description="creative.description"
              :thumbnail="creative.thumbnail"
              :index="index"
              :mode="'Video'"
              :tags="creative.tags"
            />
          </ul>
          <p v-else-if="!loadError" class="section-empty">{{ $t('creatives.common.categoryEmpty') }}</p>
        </section>

        <!-- Design Section -->
        <section v-if="activeFilter === 'all' || activeFilter === 'design'" id="design">
          <h2>Design</h2>
          <p>{{ $t('creatives.design.paragraph') }}</p>
          <ul v-if="!hasSettled && !designCreatives.length">
            <li v-for="n in 3" :key="`sk-design-${n}`" class="skeleton-card">
              <SkeletonBase aspect-ratio="16/9" border-radius="0.5rem" />
              <SkeletonBase width="70%" height="1.2rem" border-radius="0.25rem" style="margin-top: 0.5rem" />
              <div class="skeleton-tags"><SkeletonBase width="4rem" height="1.5rem" :rounded="true" /><SkeletonBase width="5rem" height="1.5rem" :rounded="true" /></div>
            </li>
          </ul>
          <ul v-else-if="designCreatives.length">
            <CreativeItem
              v-for="(creative, index) in designCreatives"
              :key="creative.id"
              :category="'design'"
              :id="creative.id"
              :title="creative.title"
              :description="creative.description"
              :thumbnail="creative.thumbnail"
              :index="index"
              :mode="'Graphic'"
              :tags="creative.tags"
            />
          </ul>
          <p v-else-if="!loadError" class="section-empty">{{ $t('creatives.common.categoryEmpty') }}</p>
        </section>
      </div>

      <a href="https://でじこんちゃん.net" aria-label="でじこんちゃんのサイトへ">
        <div id="dc-chan-container">
          <img
            id="dc-chan"
            fetchpriority="low"
            loading="lazy"
            src="@/assets/dcchan.webp"
            :alt="$t('creatives.dcChanAlt')"
            width="256"
            height="455"
          />
        </div>
      </a>
    </div>
  </main>
</template>

<script setup lang="ts">
import CreativeItem from '@/components/CreativeItem.vue';
import CreativesHero from '@/components/CreativesHero.vue';
import SkeletonBase from '@/components/SkeletonBase.vue';
import { useCreativesAPI } from '@/composables/useCreativesAPI';
import { computed, ref, watch, nextTick, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useHead } from '@unhead/vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faRotateRight } from '@fortawesome/free-solid-svg-icons';
import type { Locale, CreativeCategory, CMSCreative } from '@/types';

const { locale } = useI18n<{ message: string }, Locale>();

// microCMS API統合
const { fetchCreatives, getCreativesByCategory } = useCreativesAPI();

// 初回取得が決着したかどうか。
// isLoading は onMounted 内でしか true にならないため、SSGプリレンダ段階では
// false のまま静的HTMLへ出力され、skeleton 分岐が丸ごと抜け落ちてしまう。
// 「まだ取得していない」を初期値 false のこのフラグで表すことで、
// プリレンダHTMLにも skeleton が焼き込まれ、初回ペイントが空リストにならない。
const hasSettled = ref(false);

// 各カテゴリの作品を取得
const animationCreatives = computed(
  () => getCreativesByCategory('animation', locale.value as 'ja' | 'en').value
);
const developmentCreatives = computed(
  () => getCreativesByCategory('development', locale.value as 'ja' | 'en').value
);
const illustrationCreatives = computed(
  () => getCreativesByCategory('illustration', locale.value as 'ja' | 'en').value
);
const videoCreatives = computed(
  () => getCreativesByCategory('video', locale.value as 'ja' | 'en').value
);
const designCreatives = computed(
  () => getCreativesByCategory('design', locale.value as 'ja' | 'en').value
);

// 取得に失敗したかどうか。useCreativesAPI が export する error ref は
// モジュールスコープのシングルトンで CreativeDetail と共有され、アンマウント時にも
// クリアされないため、このビュー専用のローカルな状態として持つ。
const loadError = ref(false);

// データ取得。再読み込みボタンからも同じ関数を呼ぶ。
// hasSettled を false へ戻すことで、再試行中は skeleton が再表示される。
const load = async (): Promise<void> => {
  hasSettled.value = false;
  loadError.value = false;
  try {
    await fetchCreatives();
  } catch (err) {
    loadError.value = true;
    console.error('Failed to fetch creatives:', err);
  } finally {
    hasSettled.value = true;
  }
};

onMounted(load);

// フィルター状態管理
const activeFilter = ref<'all' | CreativeCategory>('all');

// フィルター変更ハンドラー
const handleFilterChange = (category: 'all' | CreativeCategory): void => {
  activeFilter.value = category;

  // DOM更新完了後にスクロール実行
  nextTick(() => {
    if (category === 'all') {
      // 'All'の場合はページトップにスクロール
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } else {
      // 特定カテゴリーの場合は該当セクションにスクロール
      const section = document.getElementById(category);
      if (section) {
        section.scrollIntoView({
          behavior: 'smooth',
          block: 'start', // セクションの上端を表示エリアの上端に配置
        });
      }
    }
  });
};

// SEOメタタグ設定
useHead({
  title: computed(() =>
    locale.value === 'ja'
      ? 'Creatives - 作品集 | yamashitamana.to'
      : 'Creatives - Portfolio | yamashitamana.to'
  ),
  meta: [
    {
      name: 'description',
      content: computed(() =>
        locale.value === 'ja'
          ? '山下マナトの学生時代の作品集。世田谷区公式アニメ「新BOPへようこそ！」の監督作品、Web開発プロジェクト、イラストレーション、動画制作など大学時代のクリエイティブ作品を紹介。'
          : 'Portfolio of Manato Yamashita. Director of Setagaya Ward official anime, web development projects, illustrations, video production and creative works from university.'
      ),
    },
    {
      name: 'keywords',
      content: computed(() =>
        locale.value === 'ja'
          ? '山下真和都, 山下マナト, ポートフォリオ, 作品集, 世田谷区アニメ, 新BOPへようこそ, Web開発, イラスト, 動画制作'
          : 'Manato Yamashita, Portfolio, Setagaya Animation, Web Development, Illustration, Video Production'
      ),
    },
    {
      property: 'og:title',
      content: computed(() =>
        locale.value === 'ja'
          ? 'Creatives - 作品集 | yamashitamana.to'
          : 'Creatives - Portfolio | yamashitamana.to'
      ),
    },
    {
      property: 'og:description',
      content: computed(() =>
        locale.value === 'ja'
          ? '山下マナトの作品集。アニメーション監督作品、Web開発、イラスト、動画制作など幅広いクリエイティブ作品を掲載。'
          : 'Portfolio of Manato Yamashita featuring animation direction, web development, illustrations and video production.'
      ),
    },
    {
      property: 'og:url',
      content: 'https://www.yamashitamana.to/creatives',
    },
    {
      property: 'og:type',
      content: 'website',
    },
    {
      property: 'og:image',
      content: 'https://www.yamashitamana.to/ogp.webp',
    },
    {
      name: 'twitter:title',
      content: computed(() =>
        locale.value === 'ja' ? 'Creatives - 作品集' : 'Creatives - Portfolio'
      ),
    },
    {
      name: 'twitter:description',
      content: computed(() =>
        locale.value === 'ja'
          ? '山下マナトの作品集。世田谷区公式アニメ監督作品、Web開発、イラスト、動画制作。'
          : 'Portfolio of Manato Yamashita. Animation, web development, illustrations and more.'
      ),
    },
  ],
  link: [
    {
      rel: 'canonical',
      href: 'https://www.yamashitamana.to/creatives',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: locale.value === 'ja' ? '作品集' : 'Portfolio',
          url: 'https://www.yamashitamana.to/creatives',
          description:
            locale.value === 'ja'
              ? '山下マナトのクリエイティブ作品集'
              : 'Creative portfolio of Manato Yamashita',
          creator: {
            '@type': 'Person',
            name: locale.value === 'ja' ? '山下真和都' : 'Manato Yamashita',
            url: 'https://www.yamashitamana.to/about',
          },
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: [
              {
                '@type': 'CreativeWork',
                position: 1,
                name:
                  locale.value === 'ja'
                    ? '世田谷区オリジナルアニメ「新BOPへようこそ！」'
                    : "Setagaya Ward Original Anime 'Welcome to Shin-BOP!'",
                creator: locale.value === 'ja' ? '山下真和都' : 'Manato Yamashita',
                url: 'https://tcu-animation.jp',
              },
              {
                '@type': 'WebSite',
                position: 2,
                name: 'Web Development Projects',
                creator: locale.value === 'ja' ? '山下真和都' : 'Manato Yamashita',
              },
              {
                '@type': 'VisualArtwork',
                position: 3,
                name: locale.value === 'ja' ? 'イラストレーション作品' : 'Illustration Works',
                creator: locale.value === 'ja' ? '山下真和都' : 'Manato Yamashita',
              },
            ],
          },
        })
      ),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://www.yamashitamana.to/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Creatives',
            item: 'https://www.yamashitamana.to/creatives',
          },
        ],
      }),
    },
  ],
});

// Fisher-Yatesアルゴリズムによる真のランダムシャッフル
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i]!, shuffled[j]!] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
};

// シャッフル結果キャッシュ（ロケール切替時の並び順変動を防止）
const shuffledDevCache = ref<CMSCreative[]>([]);

// ID構成が変わった場合のみ再シャッフル（watchで副作用を分離）
watch(
  () => developmentCreatives.value.map((i) => i.id).join(','),
  () => {
    const items = developmentCreatives.value;
    if (items && Array.isArray(items) && items.length > 0) {
      shuffledDevCache.value = shuffleArray(items);
    }
  },
  { immediate: true }
);

// ランダムに並び替えられたプログラミング作品のリスト
const randomizedDevelopment = computed<CMSCreative[]>(() => shuffledDevCache.value);
</script>

<style scoped>
.creatives {
  width: 100%;
  max-width: 1024px;
  margin: 0 auto;
  padding: 1rem;
  pointer-events: all;
  scroll-behavior: smooth;
}
.creatives p {
  font-size: 1rem;
}

/* 各セクションのスタイル */
section {
  scroll-margin-top: 2rem;
  margin-bottom: 4rem;
}

section h2 {
  font-size: 1.7rem;
  margin: 3rem 0 1.5rem 0; /* 下マージン微増 */
}

/* 既存のスタイル */
#main-contents {
  width: 100%;
}
#dc-chan-container {
  width: 100%;
  padding: 1rem;
  text-align: right;
}
#dc-chan {
  width: 25%;
  height: auto;
  aspect-ratio: 9 / 16;
  border-radius: 0.5rem;
  box-shadow: none;
  pointer-events: none;
}
ul {
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-gap: 1rem;
  transition: all 0.5s cubic-bezier(0.075, 0.82, 0.165, 1);
}
li {
  list-style: none;
}
.skeleton-card {
  margin: 1rem 0;
}

/* 読み込み状態のライブリージョン。エラーが無いときは高さを持たない。 */
.creatives-status:empty {
  display: none;
}
.creatives-status {
  margin: 0 0 2rem;
  padding: 1.5rem;
  border: 2px solid #000;
  border-radius: 0.75rem;
  text-align: center;
}
.creatives-status__message {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  line-height: 1.7;
}
/* 意匠は同ページの CreativesHero .filter-tag に合わせる */
.creatives-status__retry {
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
.creatives-status__retry:hover {
  background: #000;
  border-color: #000;
  color: #fff;
}

/* 取得完了かつ0件のときのカテゴリ内表示 */
.section-empty {
  margin: 1rem 0;
  color: #555;
  font-size: 0.95rem;
}
.skeleton-tags {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.8rem;
}
a {
  text-decoration: none;
}
a:hover {
  color: #000;
  text-shadow: 0 0 8px rgba(240, 211, 0, 0.7);
  text-decoration: underline;
  text-decoration-color: rgba(240, 211, 0, 0.8);
  text-underline-offset: 0.2em;
}

/* Animation, Illustrationセクションの1列表示 */
#animation ul,
#illustration ul {
  grid-template-columns: 1fr;
}

/* Animationセクションのサイズ縮小（50%程度） */
#animation ul {
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

/* タブレット表示用 */
@media screen and (max-width: 768px) {
  ul {
    grid-template-columns: repeat(2, 1fr);
  }

  /* アニメーションセクションのサイズ調整 */
  #animation ul {
    max-width: 500px;
    grid-template-columns: 1fr;
  }
}

/* モバイル表示用 */
@media screen and (max-width: 480px) {
  ul {
    grid-template-columns: 1fr;
  }

  /* アニメーションセクションは全幅表示 */
  #animation ul {
    max-width: 100%;
  }
}
</style>
