<template>
  <main class="error-page">
    <div class="container">
      <div class="error">
        <div class="content">
          <h1>{{ $t('404.title') }}</h1>
          <h2>{{ $t('404.notfound') }}</h2>
          <p>{{ $t('404.message') }}</p>
          <br />
          <RouterLink to="/" class="goback">
            <span class="circle" aria-hidden="true">
              <span class="icon arrow"></span>
            </span>
            <span class="button-text">{{ $t('404.back') }}</span>
          </RouterLink>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useHead } from '@unhead/vue';
import type { Locale } from '@/types';

const { locale } = useI18n<{ message: string }, Locale>();

// このビューは dist/404.html としてプリレンダされ、Netlify が未定義パスへ
// HTTP 404 とともに返す。静的HTMLの時点で noindex を持たせることで、
// JSを実行しないクローラにもインデックス対象外であることが伝わる。
// index.html 側の `robots: index, follow` は unhead が name 単位で上書きする。
useHead({
  title: computed(() =>
    locale.value === 'ja'
      ? 'ページが見つかりません | yamashitamana.to'
      : 'Page Not Found | yamashitamana.to'
  ),
  meta: [
    { name: 'robots', content: 'noindex, follow' },
    { name: 'googlebot', content: 'noindex, follow' },
  ],
});
</script>

<style lang="css" scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Roboto', sans-serif;
  background-color: #fff;
}

.container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.error {
  width: 100%;
  max-width: 1200px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.error .content {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0 2rem;
}

.error .content h1 {
  font-size: 6rem;
  font-weight: 900;
  color: #000;
}

.error .content h2 {
  font-size: 2.5rem;
  margin: 1rem 0;
  font-weight: 700;
  color: #000;
}

.error .content p {
  font-size: 1.5rem;
  font-weight: 400;
  color: #000;
}

/* 元は <button> をリンク見た目へ寄せる打ち消し群だった。
   <a> へ変えたため outline: none は削除している。scoped CSS では
   この規則の詳細度が main.css の :focus-visible を上回り、
   キーボードフォーカスの輪郭を消してしまうため。
   セレクタが a.goback なのは、RouterLink のルート要素が <a> であり
   scoped CSS の data-v 属性もそこへ付くため。 */
a.goback {
  position: relative;
  display: inline-block;
  width: 13rem;
  height: auto;
  margin-top: 2rem;
  padding: 0;
  border: 0;
  background: transparent;
  vertical-align: middle;
  color: inherit;
  font-size: inherit;
  font-family: inherit;
  text-decoration: none;
  cursor: pointer;
}

a.goback .circle {
  transition: all 0.45s cubic-bezier(0.65, 0, 0.076, 1);
  position: relative;
  display: block;
  margin: 0;
  width: 3rem;
  height: 3rem;
  background: var(--manapuraza-acsent);
  border-radius: 1.625rem;
}

a.goback .circle .icon {
  transition: all 0.45s cubic-bezier(0.65, 0, 0.076, 1);
  position: absolute;
  top: 0;
  bottom: 0;
  margin: auto;
  background: #fff;
}

a.goback .circle .icon.arrow {
  transition: all 0.45s cubic-bezier(0.65, 0, 0.076, 1);
  left: 0.625rem;
  width: 1.125rem;
  height: 0.125rem;
  background: none;
}

a.goback .circle .icon.arrow::before {
  position: absolute;
  content: '';
  top: -0.29rem;
  right: 0.0625rem;
  width: 0.625rem;
  height: 0.625rem;
  border-top: 0.125rem solid #fff;
  border-right: 0.125rem solid #fff;
  transform: rotate(45deg);
}

a.goback .button-text {
  transition: all 0.45s cubic-bezier(0.65, 0, 0.076, 1);
  position: absolute;
  top: 0;
  left: 0.5rem;
  right: 0;
  bottom: 0;
  padding: 0.75rem 0;
  margin: 0 0 0 2rem;
  color: #282936;
  font-weight: 700;
  line-height: 1.6;
  text-align: center;
  text-transform: uppercase;
}

a.goback:hover .circle {
  width: 100%;
}

a.goback:hover .circle .icon.arrow {
  background: #fff;
  transform: translate(1rem, 0);
}

a.goback:hover .button-text {
  color: #fff;
}

@media (max-width: 768px) {
  .error .content h1 {
    font-size: 3rem;
  }

  .error .content h2 {
    font-size: 1.5rem;
  }

  .error .content p {
    font-size: 1rem;
  }
}
</style>
