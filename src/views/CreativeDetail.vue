<template>
  <!-- スケルトン表示 -->
  <main
    v-if="!hasSettled && (!creative || creativesArePartial)"
    class="creative-detail creative-detail--skeleton"
  >
    <SkeletonBase width="8rem" height="1rem" border-radius="0.25rem" />

    <div id="main-contents">
      <SkeletonBase width="60%" height="2rem" border-radius="0.25rem" style="margin: 1.5rem 0 1rem" />

      <div class="skeleton-tags-row">
        <SkeletonBase width="4rem" height="1.8rem" :rounded="true" />
        <SkeletonBase width="5rem" height="1.8rem" :rounded="true" />
        <SkeletonBase width="3.5rem" height="1.8rem" :rounded="true" />
      </div>

      <div class="content-wrapper">
        <div class="left-column">
          <SkeletonBase aspect-ratio="16/9" border-radius="0.5rem" />
        </div>
        <div class="right-column">
          <SkeletonBase width="100%" height="1rem" style="margin-bottom: 0.8rem" />
          <SkeletonBase width="95%" height="1rem" style="margin-bottom: 0.8rem" />
          <SkeletonBase width="88%" height="1rem" style="margin-bottom: 0.8rem" />
          <SkeletonBase width="70%" height="1rem" style="margin-bottom: 1.5rem" />
          <SkeletonBase width="40%" height="0.95rem" />
        </div>
      </div>
    </div>

    <div class="cta-section">
      <SkeletonBase width="200px" height="3rem" border-radius="2rem" />
    </div>
  </main>

  <main v-else-if="creative" class="creative-detail">
    <!-- 戻るボタン -->
    <router-link to="/creatives" class="back-link">
      <font-awesome-icon :icon="faArrowLeft" />
      {{ $t('creatives.common.backToList') }}
    </router-link>

    <!-- 一覧の軽量投影のまま取得に失敗した状態。本文・画像・クレジットが代用値へ落ちており
         実際の内容と食い違うため、黙って見せずに再取得の導線を出す。 -->
    <div
      v-if="loadError && creativesArePartial"
      class="detail-notice"
      role="status"
      aria-live="polite"
    >
      <p class="detail-notice__message">{{ $t('creatives.common.loadError') }}</p>
      <p class="sr-only">{{ retryStatus }}</p>
      <button type="button" class="retry-button" :aria-disabled="isReloading" @click="load">
        <font-awesome-icon :icon="faRotateRight" />
        <span>{{ $t('creatives.common.retry') }}</span>
      </button>
    </div>

    <!-- メインコンテンツ -->
    <div id="main-contents">
      <!-- 作品タイトル -->
      <h1 ref="contentHeading" tabindex="-1" class="creative-title">{{ creative.title }}</h1>

      <!-- タグ -->
      <div class="creative-tags" v-if="creative.tags && creative.tags.length > 0">
        <span v-for="(tag, index) in creative.tags" :key="index" class="creative-tag">
          {{ tag }}
        </span>
      </div>

      <!-- 2カラムコンテンツ -->
      <div class="content-wrapper">
      <!-- 左カラム: 画像・動画 -->
      <div class="left-column">
        <!-- 作品画像ギャラリー -->
        <div class="image-gallery" v-if="detailData.images && detailData.images.length > 0">
          <img
            v-for="(image, index) in detailData.images"
            :key="index"
            :src="image"
            :srcset="getImageSrcset(image)"
            :sizes="imageSizes"
            :alt="creative.title"
            width="1200"
            height="800"
            class="gallery-image"
            loading="lazy"
          />
        </div>

        <!-- Animation 専用: YouTube 動画セクション -->
        <div v-if="hasYoutube" class="youtube-section">
          <h2>{{ $t('creatives.common.video') }}</h2>
          <div class="video-container">
            <iframe
              v-if="!isDesktop && detailData.youtube"
              :src="detailData.youtube.mobile"
              :title="creative.title"
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
            <iframe
              v-else-if="detailData.youtube"
              :src="detailData.youtube.desktop"
              :title="creative.title"
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
        </div>
      </div>

      <!-- 右カラム: 説明文・メタ情報 -->
      <div class="right-column">
        <!-- 作品説明文（Markdown対応） -->
        <div class="creative-description" v-html="renderedDescription"></div>

        <!-- 制作年 -->
        <div v-if="detailData.productionYear" class="production-year">
          <strong>{{ $t('creatives.common.productionYear') }}:</strong>
          {{ detailData.productionYear }}
        </div>

        <!-- クレジット情報 -->
        <div v-if="parsedCredits.length > 0" class="credits-section">
          <h2>{{ $t('creatives.common.credits') }}</h2>
          <dl class="credits-grid">
            <template v-for="(credit, index) in parsedCredits" :key="index">
              <dt v-if="credit.label" class="credit-label">{{ credit.label }}</dt>
              <dd class="credit-value">{{ credit.value }}</dd>
            </template>
          </dl>
        </div>
      </div>
    </div>
    </div>

    <!-- CTA ボタン -->
    <div class="cta-section">
      <Btn
        v-for="(button, index) in detailData.cta"
        :key="index"
        :href="button.href || creative.url"
        :target="button.target"
        :icon="button.icon"
        :text="$t(button.text)"
        :subText="button.subText ? $t(button.subText) : ''"
        :variant="button.variant"
      />
    </div>
  </main>

  <!-- 取得に失敗した場合。「見つからない」（次の分岐）と区別し、再試行と復帰導線を出す -->
  <main v-else-if="loadError" class="load-error">
    <h1 ref="errorHeading" tabindex="-1">{{ $t('creatives.common.loadError') }}</h1>
    <p class="sr-only" role="status" aria-live="polite">{{ retryStatus }}</p>
    <button type="button" class="retry-button" :aria-disabled="isReloading" @click="load">
      <font-awesome-icon :icon="faRotateRight" />
      <span>{{ $t('creatives.common.retry') }}</span>
    </button>
    <router-link to="/creatives" class="back-link">
      <font-awesome-icon :icon="faArrowLeft" />
      {{ $t('creatives.common.backToList') }}
    </router-link>
  </main>

  <!-- 作品が見つからない場合 -->
  <main v-else class="not-found">
    <h1 ref="contentHeading" tabindex="-1">{{ $t('creatives.common.notFound') }}</h1>
    <router-link to="/creatives" class="back-link">
      <font-awesome-icon :icon="faArrowLeft" />
      {{ $t('creatives.common.backToList') }}
    </router-link>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useHead } from '@unhead/vue';
import { marked } from 'marked';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import {
  faArrowLeft,
  faArrowUpRightFromSquare,
  faRotateRight,
} from '@fortawesome/free-solid-svg-icons';
import { useCreativesAPI, getOptimizedImageUrl } from '@/composables/useCreativesAPI';
import Btn from '@/components/Btn.vue';
import SkeletonBase from '@/components/SkeletonBase.vue';
import type { Locale, CreativeDetail, CtaButton } from '@/types';

const route = useRoute();
const { t, locale } = useI18n<{ message: string }, Locale>();

// URL パラメータから作品データを取得
const category = computed<string>(() => route.params.category as string);
const id = computed<string>(() => route.params.id as string);

// microCMS APIから作品データを取得
const { getCreativeById, fetchCreatives, creativesArePartial } = useCreativesAPI();
const creative = computed(() => getCreativeById(id.value, locale.value as 'ja' | 'en').value);

// 初回取得が決着したかどうか。
// isLoading は onMounted 内でしか true にならないため、SSGプリレンダ段階では false のまま
// 出力され、データが無いときに skeleton ではなく「作品が見つかりません」の h1 が
// 静的HTMLへ焼き込まれてしまう。「まだ取得していない」を初期値 false のこのフラグで表す。
//
// creativesArePartial は、プリレンダされた `/creatives` の軽量投影から遷移してきた状態を指す。
// この間 detail が欠けており、本文が description で代用されて実際の内容と食い違うため、
// 取得が決着するまでは skeleton を出す。取得に失敗した場合は hasSettled が真になり、
// 従来どおり description を代用した表示へ落ちる。
const hasSettled = ref(false);

// 取得に失敗したかどうか。useCreativesAPI が export する error ref は
// モジュールスコープのシングルトンで Creatives と共有され、アンマウント時にも
// クリアされないため、このビュー専用のローカルな状態として持つ。
const loadError = ref(false);

// 再取得の実行中かどうか。フォーカス中のボタンを disabled にするとブラウザが
// フォーカスを body へ落とすため、aria-disabled と load() 冒頭のガードで多重実行を防ぐ。
const isReloading = ref(false);

// 再試行の結果を伝えるライブリージョンのテキスト。エラー表示が挿入される初回は空にし
// （初回は見出しへのフォーカス移動で伝える）、再試行のたびに 空 → 本文 と更新することで
// 2回目以降の失敗も確実に読み上げられるようにする。
const retryStatus = ref('');

// 取得失敗の見出しへフォーカスを移すための参照。
const errorHeading = ref<HTMLHeadingElement | null>(null);

// 再試行が成功したときのフォーカス引き継ぎ先。本文の見出しと「見つかりません」の
// 見出しは排他分岐なので、同じ ref 名を共有できる。
const contentHeading = ref<HTMLHeadingElement | null>(null);

// データ取得。再読み込みボタンからも同じ関数を呼ぶ。
// Creatives.vue と違い hasSettled は false へ戻さない。戻すと skeleton 分岐へ切り替わって
// 再読み込みボタンが DOM から消え、フォーカスが失われるため。
const load = async (): Promise<void> => {
  // fetchCreatives は in-flight の重複排除を持たず、共有シングルトンの isLoading を
  // 並行して踏むため、連打をここで止める。
  if (isReloading.value) return;

  isReloading.value = true;
  retryStatus.value = '';

  // エラー表示から復帰する再試行かどうか。成功時のフォーカス引き継ぎと、
  // 失敗時に「見出しへフォーカスが移らない経路か」の判定に使う。
  const recovering = loadError.value;
  let failed = false;

  try {
    await fetchCreatives();
    // 冒頭ではなく成功時にだけ倒す。冒頭でクリアすると再取得の往復の間だけ
    // 分岐が「作品が見つかりません」へ落ちてしまう。
    loadError.value = false;
  } catch (err) {
    failed = true;
    loadError.value = true;
    console.error('Failed to fetch creative:', err);
  } finally {
    hasSettled.value = true;
    isReloading.value = false;
  }

  // 分岐が確定して DOM へ反映されるまで待つ。ライブリージョンもフォーカス先も
  // ここで初めて存在する。
  await nextTick();

  if (failed) {
    // 本文が無く load-error 分岐へ落ちる初回失敗だけは、見出しへのフォーカス移動が
    // 同じ文言を読み上げるためライブリージョンでは伝えない。それ以外（本文が残る
    // 軽量投影での初回失敗、および2回目以降の失敗）は、領域が挿入された後に
    // 空 → 本文 と更新して差分を作る。挿入と同時にテキストが入るライブリージョンは
    // 読み上げが実装依存になるため、挿入より後で更新する必要がある。
    if (recovering || creative.value) {
      retryStatus.value = t('creatives.common.loadError');
    }
    return;
  }

  // 再試行の成功。押されたボタンは DOM から消えるため、放置するとフォーカスが body へ
  // 落ち、位置と「成功した」という結果の両方が失われる。本文の見出しへ引き継ぐ。
  if (recovering) {
    contentHeading.value?.focus();
  }
};

onMounted(load);

// 取得失敗の表示は skeleton と差し替わる形で挿入される。挿入と同時にテキストが入る
// ライブリージョン（role="alert"）は読み上げが実装依存になるうえ、同じ文言で再び
// 失敗すると無音になるため、見出しへフォーカスを移して確実に伝える。
// 遷移直後のフォーカスは body にあり、奪う対象は無い。
watch(loadError, async (failed) => {
  if (!failed || creative.value) return;
  await nextTick();
  errorHeading.value?.focus();
});

// Detail データの構造型定義
interface DetailData {
  images: string[];
  descriptionMarkdown: string;
  youtube: { mobile: string; desktop: string } | null;
  productionYear: string;
  credits: string[];
  cta: CtaButton[];
}

// Detail データの取得（fallback 対応）
const detailData = computed<DetailData>(() => {
  if (!creative.value)
    return {
      images: [],
      descriptionMarkdown: '',
      youtube: null,
      productionYear: '',
      credits: [],
      cta: [],
    } as DetailData;

  const detail: Partial<CreativeDetail> = creative.value.detail || {};

  return {
    images: detail.images && detail.images.length > 0 ? detail.images : [creative.value.thumbnail],
    descriptionMarkdown: detail.descriptionMarkdown || creative.value.description,
    youtube: detail.youtube || null,
    productionYear: detail.productionYear || '',
    credits: detail.credits || [],
    cta:
      detail.cta && detail.cta.length > 0
        ? detail.cta
        : [
            {
              href: creative.value.url,
              target: '_blank',
              icon: faArrowUpRightFromSquare,
              text: 'creatives.common.viewProject',
              subText: '',
              variant: 'primary',
            },
          ],
  };
});

// YouTube セクションの表示判定
const hasYoutube = computed<boolean>(() => {
  return detailData.value.youtube !== null;
});

// 画像のレスポンシブ srcset を生成
const getImageSrcset = (imageUrl: string): string => {
  if (!imageUrl.includes('images.microcms-assets.io')) {
    return '';
  }
  return `${getOptimizedImageUrl(imageUrl, 600)} 600w, ${getOptimizedImageUrl(imageUrl, 1200)} 1200w, ${getOptimizedImageUrl(imageUrl, 1800)} 1800w`;
};

// 画像の sizes 属性
const imageSizes = '(max-width: 768px) 600px, (max-width: 1200px) 1200px, 1800px';

// デスクトップ判定
const isDesktop: Ref<boolean> = ref(false);
let mediaQueryList: MediaQueryList | null = null;
// GSAP timeline 参照（クリーンアップ用）
let tl: gsap.core.Timeline | null = null;

const handleMediaQueryChange = (e: MediaQueryListEvent): void => {
  isDesktop.value = e.matches;
};

onMounted(() => {
  mediaQueryList = window.matchMedia('(min-width: 968px)');
  isDesktop.value = mediaQueryList.matches;
  mediaQueryList.addEventListener('change', handleMediaQueryChange);
});

// creativeデータが利用可能になった時にGSAPアニメーション開始
watch(
  () => creative.value,
  async (val) => {
    if (val && !tl) {
      await nextTick();
      try {
        const { gsap } = await import('gsap');

        tl = gsap.timeline();

        // 1. 戻るボタン（最優先で表示）
        tl.fromTo(
          '.back-link',
          { x: -20, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
        );

        // 2. タイトル
        tl.fromTo(
          '.creative-title',
          { y: 15, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' },
          '-=0.2'
        );

        // 3. タグ
        tl.fromTo(
          '.creative-tags',
          { y: 10, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' },
          '-=0.25'
        );

        // 4. 左カラム（画像ギャラリー）
        tl.fromTo(
          '.left-column',
          { x: -30, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' },
          '-=0.2'
        );

        // 5. 右カラム（説明文・メタ情報）
        tl.fromTo(
          '.right-column > *',
          { y: 15, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.45,
            stagger: 0.06,
            ease: 'power2.out',
          },
          '-=0.3'
        );

        // 6. CTAセクション（固定位置）
        tl.fromTo(
          '.cta-section',
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' },
          '-=0.2'
        );
      } catch (error) {
        console.error('Animation error:', error);
      }
    }
  }
);

onBeforeUnmount(() => {
  tl?.kill();
  tl = null;
  if (mediaQueryList) {
    mediaQueryList.removeEventListener('change', handleMediaQueryChange);
  }
});

// Markdown レンダリング
const renderedDescription = computed<string>(() => {
  if (!creative.value) return '';
  const markdownText = t(detailData.value.descriptionMarkdown);
  return marked(markdownText, { breaks: true }) as string;
});

// クレジット情報のパース用の型定義
interface ParsedCredit {
  label: string;
  value: string;
}

// クレジット情報のパース
const parsedCredits = computed<ParsedCredit[]>(() => {
  if (!detailData.value.credits || detailData.value.credits.length === 0) {
    return [];
  }

  return detailData.value.credits
    .map((credit): ParsedCredit | null => {
      const translatedCredit = t(credit);
      if (!translatedCredit) return null;

      const splitIndex =
        translatedCredit.indexOf(':') !== -1
          ? translatedCredit.indexOf(':')
          : translatedCredit.indexOf('：');

      if (splitIndex === -1) {
        return { label: '', value: String(translatedCredit).trim() };
      }

      const label = translatedCredit.slice(0, splitIndex).trim();
      const value = translatedCredit.slice(splitIndex + 1).trim();
      return { label, value };
    })
    .filter((credit): credit is ParsedCredit => credit !== null);
});

// creative が無いときのメタ。状態を区別せず notFound を出すと、取得に失敗しただけでも
// title と OGP が「作品が見つかりません」と断定してしまう。
// 読み込み中（!hasSettled）を Not Found 側へ倒すのは意図的。プリレンダでデータが欠落した
// ページは .not-found を含まず `<title>Not Found` だけが可視シグナルになるため
// （docs/standards/ssg-guidelines.md の検証チェックリストがこれに依存している）。
const pageTitle = computed<string>(() => {
  if (creative.value) return `${t(creative.value.title)} | yamashitamana.to`;
  if (loadError.value) return 'Creatives | yamashitamana.to';
  return 'Not Found | yamashitamana.to';
});

const pageDescription = computed<string>(() => {
  if (creative.value) return t(creative.value.description);
  if (loadError.value) return t('creatives.common.loadError');
  return t('creatives.common.notFound');
});

// SEO メタタグ設定
useHead({
  title: pageTitle,
  meta: [
    {
      name: 'description',
      content: pageDescription,
    },
    {
      property: 'og:title',
      content: pageTitle,
    },
    {
      property: 'og:description',
      content: pageDescription,
    },
    {
      property: 'og:url',
      content: computed(
        () => `https://www.yamashitamana.to/creatives/${category.value}/${id.value}`
      ),
    },
    {
      property: 'og:image',
      content: computed(() =>
        creative.value ? creative.value.thumbnail : 'https://www.yamashitamana.to/ogp.webp'
      ),
    },
    {
      property: 'og:type',
      content: 'article',
    },
    {
      property: 'og:image:alt',
      content: computed(() =>
        creative.value ? t(creative.value.title) : 'yamashitamana.to'
      ),
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:title',
      content: pageTitle,
    },
    {
      name: 'twitter:description',
      content: pageDescription,
    },
    {
      name: 'twitter:image',
      content: computed(() =>
        creative.value ? creative.value.thumbnail : 'https://www.yamashitamana.to/ogp.webp'
      ),
    },
  ],
  link: [
    {
      rel: 'canonical',
      href: computed(() => `https://www.yamashitamana.to/creatives/${category.value}/${id.value}`),
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() => {
        if (!creative.value) return '{}';
        const data: Record<string, unknown> = {
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: t(creative.value.title),
          description: t(creative.value.description),
          url: `https://www.yamashitamana.to/creatives/${category.value}/${id.value}`,
          image: creative.value.thumbnail,
          thumbnailUrl: creative.value.thumbnail,
          creator: {
            '@type': 'Person',
            '@id': 'https://www.yamashitamana.to/#person',
            name: locale.value === 'ja' ? '山下真和都' : 'Manato Yamashita',
          },
          genre: category.value,
          inLanguage: locale.value,
          isPartOf: {
            '@type': 'CollectionPage',
            url: 'https://www.yamashitamana.to/creatives',
          },
        };
        if (detailData.value.productionYear) {
          data.dateCreated = detailData.value.productionYear;
        }
        return JSON.stringify(data);
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: computed(() => {
        if (!creative.value) return '{}';
        return JSON.stringify({
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
            {
              '@type': 'ListItem',
              position: 3,
              name: t(creative.value.title),
              item: `https://www.yamashitamana.to/creatives/${category.value}/${id.value}`,
            },
          ],
        });
      }),
    },
  ],
});
</script>

<style scoped>
.creative-detail {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100%;
  color: var(--color-text, #111);
  display: flex;
  flex-direction: column;
}

.skeleton-tags-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

#main-contents {
  max-width: 760px;
  margin: 0 auto;
  width: 100%;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #2c2c2c;
  text-decoration: none;
  font-weight: 600;
  margin-bottom: 1.5rem;
  transition:
    color 0.3s ease,
    text-decoration 0.3s ease;
}

.back-link:hover {
  color: #555;
  text-decoration: underline;
  text-underline-offset: 0.2rem;
}

.creative-title {
  font-size: 1.9rem;
  font-weight: 600;
  margin-bottom: 0;
  letter-spacing: 0;
  color: var(--color-text, #111);
}

.content-wrapper {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.5rem;
  margin-bottom: 2.5rem;
  align-items: start;
}

.left-column {
  /* 画像・動画エリア */
}

.right-column {
  /* 説明文・メタ情報エリア */
}

.image-gallery {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
}

.gallery-image {
  width: 100%;
  height: auto;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.youtube-section {
  margin-bottom: 2rem;
}

.youtube-section h2 {
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #222;
}

.video-container {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 aspect ratio */
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.video-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}

.creative-description {
  font-size: 1.05rem;
  line-height: 2;
  margin-bottom: 2rem;
  color: var(--color-text, #111);
}

.creative-description :deep(h2) {
  font-size: 1.35rem;
  font-weight: 600;
  margin: 2rem 0 1rem;
  color: var(--color-text, #111);
}

.creative-description :deep(h3) {
  font-size: 1.2rem;
  font-weight: 500;
  margin: 1.5rem 0 0.8rem;
  color: #111;
}

.creative-description :deep(p) {
  margin-bottom: 1.2rem;
}

.creative-description :deep(ul),
.creative-description :deep(ol) {
  margin: 1rem 0;
  padding-left: 2rem;
}

.creative-description :deep(li) {
  margin-bottom: 0.5rem;
}

.creative-description :deep(strong) {
  font-weight: 700;
  color: var(--color-text, #111);
}

.creative-description :deep(code) {
  background: rgba(240, 211, 0, 0.15);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

.production-year {
  font-size: 0.95rem;
  margin-bottom: 2rem;
  color: #555;
  font-weight: 500;
}

.credits-section {
  margin-bottom: 2rem;
}

.credits-section h2 {
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #222;
}

.credits-grid {
  display: grid;
  grid-template-columns: 160px 1fr;
  column-gap: 1rem;
  row-gap: 0.75rem;
  margin: 0;
}

.credit-label {
  font-size: 0.9rem;
  color: #777;
  font-weight: 600;
  text-align: left;
  letter-spacing: -0.03em;
}

.credit-value {
  margin: 0;
  font-size: 1rem;
  color: #333;
  letter-spacing: -0.03em;
}

.creative-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
  margin-bottom: 2rem;
}

.creative-tag {
  display: inline-block;
  padding: 0.4rem 0.9rem;
  background: transparent;
  border: 1px solid #000;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 500;
  color: #000;
  transition: all 0.2s ease;
}

.creative-tag:hover {
  background: #000;
  border-color: #000;
  color: #fff;
  transform: translateY(-1px);
}

.cta-section {
  left: 0;
  right: 0;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
}

.cta-section > * {
  flex: 1;
  min-width: 200px;
}

.not-found,
.load-error {
  max-width: 900px;
  margin: 0 auto;
  padding: 4rem 1rem;
  text-align: center;
}

.not-found h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 2rem;
  color: #333;
}

/* エラー文は一文が長いため、.not-found h1 の 2rem ではなく可読性を優先したサイズにする */
.load-error h1 {
  max-width: 34rem;
  margin: 0 auto 2rem;
  font-size: 1.4rem;
  font-weight: 700;
  line-height: 1.9;
  color: #333;
}

/* プログラム的なフォーカス移動で枠を出さない
   （グローバルの指定は :focus-visible なので通常は出ないが、実装差の保険） */
.load-error h1:focus,
.creative-title:focus,
.not-found h1:focus {
  outline: none;
}

/* ボタンを中央の block 相当にして、次の復帰リンクを自然に改行させる。
   back-link 側の display を上書きすると、768px 以下で固定の円形アイコンになる際の
   flex 中央寄せを詳細度で打ち消してアイコンがずれるため、そちらは触らない。 */
.load-error .retry-button {
  display: flex;
  width: fit-content;
  margin: 0 auto 2rem;
}

/* 本文が代用値へ落ちたまま取得に失敗した状態の告知 */
.detail-notice {
  margin: 0 0 2rem;
  padding: 1.25rem;
  border: 2px solid #000;
  border-radius: 0.75rem;
  text-align: center;
}

.detail-notice__message {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  line-height: 1.7;
}

/* 意匠は同系ページの Creatives.vue .creatives-status__retry に合わせる */
.retry-button {
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

.retry-button:hover {
  background: #000;
  color: #fff;
}

.retry-button[aria-disabled='true'] {
  opacity: 0.6;
  cursor: progress;
}

@media screen and (max-width: 768px) {
  /* Phase 1: 戻るボタンの固定配置（アイコンのみ、高さをCTAと揃える） */
  .back-link {
    position: fixed;
    top: 1rem;
    left: 1.25rem;
    z-index: 110; /* CTA (z-index: 100) より上層 */

    /* アイコンのみ表示、高さを CTA と揃える */
    width: 2.75rem;
    height: 2.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    font-size: 0; /* テキストを非表示 */

    /* 視認性確保 */
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-radius: 50%; /* 円形 */
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);

    /* ホバー時の微調整 */
    transition: all 0.2s ease;
  }

  .back-link svg {
    font-size: 1.2rem; /* アイコンサイズを明示的に指定 */
    /* Font Awesome arrow-left アイコンの視覚的中央配置 */
    transform: translateX(2px);
  }

  .back-link:hover {
    background: rgba(255, 255, 255, 0.98);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }

  /* Phase 3: コンテンツ上部パディング調整 */
  .creative-detail {
    padding-top: 5rem; /* 戻るボタン + CTA 領域を十分に確保 */
    padding-bottom: 2rem; /* 下部固定なし → パディング削減 */
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }

  .content-wrapper {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .creative-title {
    font-size: 1.4rem;
    margin-top: 0; /* マージン削除で上に配置 */
    margin-bottom: 1rem;
    padding-right: 5rem; /* 右上の CTA 領域を避ける */
    word-break: break-word;
  }

  .creative-tags {
    margin-bottom: 1.5rem;
  }

  .image-gallery {
    grid-template-columns: 1fr;
  }

  .credits-grid {
    grid-template-columns: 1fr;
  }

  .credit-label {
    opacity: 0.8;
  }
}

@media screen and (max-width: 480px) {
  /* Phase 4: 超小型端末サイズ縮小 */
  .back-link {
    top: 0.75rem;
    left: 0.75rem;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%; /* 円形維持 */
  }

  .back-link svg {
    font-size: 1.1rem; /* アイコンサイズを縮小 */
    /* 視覚的中央配置を維持 */
    transform: translateX(2px);
  }

  .cta-section > * {
    padding: 0.6rem 1rem; /* CTA ボタンサイズ縮小 */
    font-size: 0.9rem;
  }

  .creative-detail {
    padding: 1.5rem 1rem 5rem 1rem;
  }

  .creative-title {
    font-size: 1.25rem;
  }

  .creative-tags {
    margin-bottom: 1rem;
    gap: 0.5rem;
  }

  .creative-tag {
    font-size: 0.7rem;
    padding: 0.3rem 0.7rem;
  }

  .creative-description {
    font-size: 1rem;
    line-height: 1.8;
  }
}
</style>
