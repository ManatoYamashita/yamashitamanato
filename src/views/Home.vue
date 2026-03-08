<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useHead } from '@vueuse/head';
import type { Locale } from '@/types';

const { locale } = useI18n<{ message: string }, Locale>();

useHead({
  title: computed(() =>
    locale.value === 'ja'
      ? 'yamashitamana.to | 山下マナト（山下真和都）'
      : 'yamashitamana.to | Manato Yamashita Portfolio'
  ),
  meta: [
    {
      name: 'description',
      content: computed(() =>
        locale.value === 'ja'
          ? '山下真和都（山下マナト）のポートフォリオサイト。Web開発、アニメーション、イラスト、動画制作などのクリエイティブ作品を公開中。'
          : 'Portfolio of Manato Yamashita. Showcasing web development, animation, illustration, and video production works.'
      ),
    },
    {
      property: 'og:title',
      content: computed(() =>
        locale.value === 'ja'
          ? '山下真和都（マナト）| yamashitamana.to Portfolio 2026'
          : 'Manato Yamashita | yamashitamana.to Portfolio 2026'
      ),
    },
    {
      property: 'og:description',
      content: computed(() =>
        locale.value === 'ja'
          ? '山下真和都（山下マナト）のポートフォリオサイト。Web開発、アニメーション、イラスト、動画制作などのクリエイティブ作品を公開中。'
          : 'Portfolio of Manato Yamashita. Web development, animation, illustration, and video production works.'
      ),
    },
    {
      property: 'og:url',
      content: 'https://www.yamashitamana.to/',
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
        locale.value === 'ja'
          ? '山下真和都（マナト）| yamashitamana.to'
          : 'Manato Yamashita | yamashitamana.to'
      ),
    },
    {
      name: 'twitter:description',
      content: computed(() =>
        locale.value === 'ja'
          ? '山下真和都のポートフォリオサイト。Web開発、アニメーション、クリエイティブ作品を公開中。'
          : 'Portfolio of Manato Yamashita. Web development, animation, and creative works.'
      ),
    },
  ],
  link: [
    {
      rel: 'canonical',
      href: 'https://www.yamashitamana.to/',
    },
  ],
});
</script>

<template><main class="home"></main></template>

<style lang="css" scoped>
main.home {
  display: none;
  pointer-events: none;
  /* scroll-behavior: none; */
  overflow: hidden;
}
</style>
