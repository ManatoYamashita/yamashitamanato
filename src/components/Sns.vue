<!-- SnsIcons.vue -->
<template>
  <div id="icons">
    <a
      v-for="icon in icons"
      :key="icon.id"
      :href="icon.href"
      :id="icon.id"
      ref="iconRefs"
      class="icon-link"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="`${icon.label} (${$t('common.opensInNewTab')})`"
    >
      <font-awesome-icon :icon="icon.icon" class="sns" />
    </a>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faGithub, faLinkedin, faTwitter, faInstagram } from '@fortawesome/free-brands-svg-icons';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

// アイコンリンクの型定義
interface SnsLink {
  id: string;
  href: string;
  icon: IconDefinition;
  label: string;
}

// アイコンの情報を定義（すべて Font Awesome アイコンに統一）
const icons: SnsLink[] = [
  {
    id: 'bento',
    href: 'https://bento.me',
    icon: faLink,
    label: 'Bento Profile',
  },
  {
    id: 'github',
    href: 'https://github.com/ManatoYamashita',
    icon: faGithub,
    label: 'GitHub',
  },
  {
    id: 'linkedin',
    href: 'https://www.linkedin.com/in/yamashitamanato/',
    icon: faLinkedin,
    label: 'LinkedIn',
  },
  {
    id: 'twitter',
    href: 'https://yamashitamana.to/twitter',
    icon: faTwitter,
    label: 'Twitter',
  },
  {
    id: 'instagram',
    href: 'https://www.instagram.com/manapuraza_com/',
    icon: faInstagram,
    label: 'Instagram',
  },
];

// refs を格納する配列
const iconRefs = ref<HTMLElement[]>([]);

// GSAP tween参照（クリーンアップ用）
let tween: gsap.core.Tween | null = null;

onMounted(async () => {
  // reduced-motion: アニメーションをスキップ
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // GSAPを動的インポートして初期バンドルサイズを削減
  const { gsap } = await import('gsap');
  // アニメーションの設定
  tween = gsap.fromTo(
    iconRefs.value,
    {
      y: 50,
    },
    {
      y: 0,
      ease: 'power2.out',
      stagger: 0.1,
    }
  );
});

onUnmounted(() => {
  tween?.kill();
  tween = null;
});
</script>

<style scoped>
#icons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin: 1rem 0;
  overflow-y: hidden;
}
.sns {
  font-size: 1.7rem;
  color: #2e2e2e;
  transition: all 0.3s ease;
}
.sns:hover {
  color: #f0d300;
  transform: scale(1.1);
}
</style>
