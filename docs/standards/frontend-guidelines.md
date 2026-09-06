# フロントエンド実装ガイドライン

## Vue 3 Composition API

### 基本原則
- `<script setup>` 構文を優先使用
- Composition API（`ref`, `computed`, `watch`等）を活用
- Options API は使用しない

### DOM操作タイミング管理

#### nextTick() の使用

Vue 3では、リアクティブな値の変更後、DOMは即座には更新されません。DOM操作を行う場合は必ず`nextTick()`を使用してください。

**❌ BAD: DOM未更新の可能性**
```javascript
import { ref } from 'vue';

const activeFilter = ref('all');

const handleChange = (category) => {
  activeFilter.value = category;

  // v-ifによるレンダリング前に要素を取得しようとする
  const section = document.getElementById(category);  // null になる可能性
  if (section) {
    section.scrollIntoView();
  }
};
```

**✅ GOOD: DOM更新後に確実に取得**
```javascript
import { ref, nextTick } from 'vue';

const activeFilter = ref('all');

const handleChange = (category) => {
  activeFilter.value = category;

  // DOM更新完了を待機
  nextTick(() => {
    const section = document.getElementById(category);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
};
```

#### 使用が必要なケース

以下の場合は必ず`nextTick()`を使用：

1. **v-if による条件付きレンダリング後の要素取得**
   ```vue
   <section v-if="activeFilter === 'development'" id="development">
     <!-- content -->
   </section>
   ```
   上記のようなセクションへのDOM操作は`nextTick()`内で実行

2. **リアクティブな値変更後のDOM計測**
   ```javascript
   const isOpen = ref(false);

   const toggle = () => {
     isOpen.value = !isOpen.value;

     nextTick(() => {
       // DOM更新後にサイズを計測
       const height = element.offsetHeight;
     });
   };
   ```

3. **動的に生成された要素へのフォーカス**
   ```javascript
   const showInput = ref(false);

   const openInput = () => {
     showInput.value = true;

     nextTick(() => {
       document.getElementById('dynamic-input').focus();
     });
   };
   ```

### スムーズスクロールの実装

#### scrollIntoView() の推奨パターン

要素へのスクロールには`scrollIntoView()`を使用：

```javascript
const scrollToSection = (sectionId) => {
  nextTick(() => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({
        behavior: 'smooth',  // スムーズスクロール
        block: 'start'       // セクション上端を表示エリア上端に配置
      });
    }
  });
};
```

#### scrollIntoView() vs window.scrollTo()

| メソッド | 使用ケース | メリット |
|---------|----------|---------|
| `scrollIntoView()` | 要素ベースのスクロール | 位置を自動計算、相対的なスクロール位置を保証 |
| `window.scrollTo()` | 絶対座標指定 | 細かい制御が可能 |

**推奨**: 要素へのスクロールは`scrollIntoView()`を優先

### 実装例

**Creativesページのフィルタリング機能**（`src/views/Creatives.vue`）

```javascript
import { ref, nextTick } from 'vue';

const activeFilter = ref('all');

const handleFilterChange = (category) => {
  activeFilter.value = category;

  // DOM更新完了後にスクロール実行
  nextTick(() => {
    if (category === 'all') {
      // 'All'の場合はページトップにスクロール
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } else {
      // 特定カテゴリーの場合は該当セクションにスクロール
      const section = document.getElementById(category);
      if (section) {
        section.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  });
};
```

## コンポーネント設計

### Props と Emit

#### Props定義

```javascript
const props = defineProps({
  title: {
    type: String,
    required: true
  },
  tags: {
    type: Array,
    required: false,
    default: () => []
  }
});
```

#### Emit定義

```javascript
const emit = defineEmits(['filter-change', 'item-click']);

const handleClick = (data) => {
  emit('filter-change', data);
};
```

### アイコンの受け渡し

**FontAwesome の `IconDefinition` を `<component :is>` へ渡してはいけない。**

`faArrowUpRightFromSquare` などの実体は `{ prefix, iconName, icon: [...] }` という素のオブジェクトで、
Vue コンポーネントではない。`<component :is>` に渡すと Vue は Options API のコンポーネント定義として
解釈するが、`render` も `template` も `setup` も持たないため**何も描画されない**。

```vue
<!-- NG: 何も出ない。vue-tsc も通ってしまう（Component 型がゆるいため） -->
<component v-if="icon" :is="icon" class="icon" />

<!-- OK -->
<font-awesome-icon v-if="icon" :icon="icon" class="icon" />
```

prop の型も実体に合わせる。`Component`（vue）ではなく `IconDefinition` を使うこと。

```ts
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface Props {
  icon?: IconDefinition | null;
}
```

サイズは CSS の `font-size` で制御する。`font-awesome-icon` の `size` prop は `'lg'` / `'2x'` 等の
**文字列のみ**を受け付けるため、`:size="20"` のような数値は prop バリデーションに落ちる
（開発ビルドでは警告、本番ビルドでは無言で無視される）。

**検証方法**: プリレンダ済みHTMLにアイコンの `<svg>` が実際に出ているかを確認する。
描画されていなくても型検査もビルドも通るため、目視かこの種の grep でしか気づけない。

```bash
npm run build

# 各CTAボタンの最初の子ノードを列挙する。
# `<svg` ならアイコンが出ており、`<!--` なら v-if が偽か描画に失敗している。
grep -oh '<button class="primary"[^>]*><[a-z!/-]*' dist/creatives/*/*.html | sed 's/.*>//' | sort | uniq -c
```

なお FontAwesome の `<svg>` は既定で `aria-hidden="true"` を持つため、アイコンを足しても
ボタンのアクセシブル名は変わらない（`docs/standards/accessibility.md` の Label in Name を参照）。

## ルーティング

### Vue Router の基本

- ルート定義は `src/router/routes.ts`。`src/router/index.ts` はその再エクスポートと、クライアント専用の副作用登録（`setupClientRouterEffects()`）を担う。
- ルーター本体は `src/main.ts` の `ViteSSG()` が `routes` と `scrollBehavior` から生成する。`createRouter()` を直接呼ばない。
- `Home` のみ静的 import、それ以外は遅延ロード：`component: () => import('../views/About.vue')`。
- キャッチオール `/:pathMatch(.*)*` を `src/views/404.vue` へ割り当て、必ず配列の末尾に置く。
- 作品詳細 `/creatives/:category/:id` は `beforeEnter` で `isValidCategory()` を検証し、不正なカテゴリは `/404` へ返す。
- 画面遷移は `App.vue` の `<transition name="slide" mode="out-in">`。`:key="$route.fullPath"` で再マウントを保証する。
- ナビゲーション進行バーとコンポーネントのプリロードは `setupClientRouterEffects()` に集約する。SSR 段階では `document`/`window` が存在しないため呼ばれない。
- 未定義パスは `netlify.toml` が `dist/404.html` を HTTP 404 で返す。SPA フォールバック（`index.html` を 200 で返す経路）は `/creatives/*` に限定されている。
- **内部遷移は必ず `<RouterLink to="/...">`。`<a href="https://www.yamashitamana.to">` のような絶対URLを書かない。** ドメインが固定されるため localhost と Netlify Deploy Preview から本番サイトへ離脱してしまい、プレビューでの検証が続けられなくなる。SPA遷移も失われフルリロードが走る（#21, #54）。
- `RouterLink` のルート要素は `<a>`。scoped CSS の `data-v` 属性もそこへ付くため、`a.foo` のような要素セレクタで問題なくスタイルが当たる。
- **`props: true` は、ビュー側が `defineProps` を宣言しているときだけ付ける。** 宣言が無いとルートパラメータがフォールスルー属性としてルート要素へ出力され、`<main class="creative-detail" category="development">` のようにHTML仕様上無効な属性になる（#34）。`useRoute()` でパラメータを読むビューには不要。
- 上記を `inheritAttrs: false` で止めてはいけない。`src/App.vue` がフォールスルーで渡している `id="scrollable-aria"` も同時に消え、ビュー内が全てクリック不能になる。理由は `docs/standards/accessibility.md` の「ランドマーク構造」節を参照。

## 国際化 (i18n)

### 翻訳キーの命名規則

```
{category}.{subcategory}.{item}.(title|description)
```

例：
```json
{
  "creatives": {
    "dev": {
      "manapuraza": {
        "title": "yamashitamana.to",
        "description": "Vue.js製のポートフォリオサイト"
      }
    }
  }
}
```

### 未使用キーを消すときの注意

**`t('...')` の grep だけで「参照なし」と判断してはいけない。** キーは素の文字列として
データに埋め込まれていることがある。実例として `scripts/generate-microcms-csv.ts` は
`title: 'creatives.animation.tcuAnimation.title'` のように i18n キーを**値として**持ち、
microCMS へ初期投入する CSV を組み立てている。`t(` を検索しても引っかからないため、
これを消すと `npm run generate-csv` が壊れる。

手順は2段階にする。

```bash
# 1) t('...') で静的に参照されているキーを列挙する（候補の絞り込み用）
grep -rhoE "t\(['\`\"][a-zA-Z0-9_.]+" src/ scripts/ netlify/ \
  | sed -E "s/^.*t\(['\`\"]//" | sort -u

# 2) 削除候補ごとに「キー文字列そのもの」を全体検索する（これが本番の確認）
grep -rn "about.ctaLabel\|'ctaLabel'" src/ scripts/ netlify/ index.html
```

1 の一覧は `.` のようなノイズを含むうえ、上記のとおり取りこぼす。**必ず 2 を通すこと。**

キーを動的に組み立てている箇所も静的検索では追えない。現状は1箇所だけなので、
削除対象がその接頭辞に該当しないかを目視で確認する。

```bash
grep -rnE '(^|[^a-zA-Z0-9_.])\$?t\(`' src/ scripts/
# => src/components/Menu.vue:232:  return t(`navbar.menu.${key}`);
```

### 使用方法

```vue
<template>
  <h1>{{ $t('creatives.dev.manapuraza.title') }}</h1>
  <p>{{ t('creatives.dev.manapuraza.description') }}</p>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>
```

### 初期化設定

i18n インスタンスは `src/main.ts` の `createI18n()` で 1 度だけ生成する。

| オプション | 値 | 理由 |
| --- | --- | --- |
| `legacy` | `false` | Composition API モード（`useI18n()`）を使う |
| `locale` | `'ja'` | 既定ロケール |
| `fallbackLocale` | `'en'` | キー欠損時に英語へフォールバックする |
| `globalInjection` | `true` | テンプレートで `$t()` を直接使えるようにする |
| `warnHtmlMessage` | `false` | HTML を含む訳文の警告を抑止する |

- 辞書は `ja` を同期 import し、`en` は `requestIdleCallback` で遅延させて `i18n.global.setLocaleMessage('en', ...)` へ流し込む。SSG のプリレンダ段階は日本語のみを同期ロードする。
- 翻訳を追加するときは `locales/ja.json` と `locales/en.json` の**両方**を更新する。英語は遅延ロード完了後に反映される。
- `vite.config.ts` の `define` で `__VUE_I18N_FULL_INSTALL__` / `__VUE_I18N_LEGACY_API__` / `__INTLIFY_PROD_DEVTOOLS__` を `false` に固定し、未使用の Legacy API と devtools をバンドルから落とす。

## 新規ページ追加チェック

静的ページを 1 枚追加するときに触るファイルは 1 か所ではない。以下をすべて満たすまで完了としない。

- [ ] `src/views/Name.vue` を追加し、`src/router/routes.ts` へ遅延 import として登録する（キャッチオールより前に置く）。
- [ ] プリレンダ対象にするなら `vite.config.ts` の `STATIC_ROUTES` へパスを追加する。漏れると静的 HTML が生成されず、`netlify.toml` の最終ルールで `dist/404.html` が HTTP 404 として返る。
- [ ] `scripts/generate-sitemap.ts` の `staticPages` へ追加する。漏れると sitemap.xml に載らない。
- [ ] `locales/ja.json` と `locales/en.json` の両方へ翻訳キーを追加する。
- [ ] `src/components/Menu.vue` のデスクトップリンクとモバイルメニューリンクを両方更新する。
- [ ] SSR 段階で `document`/`window` を参照しない。`onMounted` 前提の初期化は `isClient` ガードの内側へ置く（詳細は `docs/standards/ssg-guidelines.md`）。
- [ ] GSAP など重い依存はページ側で動的 import する。
- [ ] 540px 以下でのレイアウト崩れと `pointer-events` の指定を確認する。

## パフォーマンス最適化

### 遅延ロード

- コンポーネント：`defineAsyncComponent()`
- ルート：`() => import()`
- 画像：`loading="lazy"`

### リアクティブシステムの最適化

- 大きなオブジェクトは`shallowRef()`を検討
- 頻繁に変更されないデータは`computed()`でキャッシュ

## モバイルメニューのアニメーションパターン

### 連続的な開閉アニメーション

モバイルメニューの開閉アニメーションでは、視覚的な連続性を最優先に設計します。

#### 基本原則

1. **連続性（Continuity）**: 要素は決して完全に消えてはいけない
   - `opacity: 0` は避け、最低 `0.3` を維持
   - ユーザーが状態変化を追跡できることが重要

2. **明瞭性（Clarity）**: ユーザーは現在の状態を瞬時に理解できなければならない
   - レイヤー間の前後関係を `z-index` で明確に制御
   - アニメーション中も要素の役割が明確

3. **洗練性（Sophistication）**: 必要最小限のエフェクトで最大の効果を生み出す
   - Y軸移動 + スケール + 透明度の組み合わせ
   - 過度な演出は避ける

#### レイヤードトランジション方式

**実装例（Menu.vue）**:

```javascript
// 開く時：ページタイトルを後ろに引っ込める
gsap.timeline({
  defaults: { ease: 'power2.out' },
  onComplete: () => { isAnimating.value = false; }
})
.to('.mobile-page-title', {
  opacity: 0.3,           // 薄く残す（重要！）
  scale: 0.92,
  y: -10,                 // 上方向に押し込む
  zIndex: 1,              // 背後に配置
  duration: 0.2
})
.to('.mobile-menu-card', {
  opacity: 1,
  y: 0,
  scale: 1,
  zIndex: 5,              // 前面に配置
  duration: 0.25,
  ease: 'back.out(1.2)'
}, '-=0.1');              // 少し重ねて実行
```

**ポイント**:
- **最低opacity値**: `0.3` を維持し、完全には消さない
- **Y軸移動**: "引き出す"/"押し込む"動きで空間的な変化を表現
- **z-index制御**: アニメーション中に動的に制御
- **タイミング調整**: `-=0.1` で要素の動きを重ねる

#### 状態リセットの重要性

アニメーション完了後、必ず状態をリセット：

```javascript
gsap.timeline({
  onComplete: () => {
    isMobileMenuOpen.value = false;
    isAnimating.value = false;

    // 状態リセット（重要！）
    gsap.set('.mobile-page-title', {
      opacity: 1,
      scale: 1,
      y: 0,
      zIndex: 5
    });
    gsap.set('.mobile-menu-card', {
      opacity: 0,
      y: 8,
      scale: 0.95,
      zIndex: 1
    });
  }
})
```

### アイコン切り替えアニメーション

#### クロスフェード+回転方式

両アイコンを `position: absolute` で重ね、CSS transitionのみで実装（GSAP不要）。

**HTML構造**:

```html
<div class="toggle-icon-container">
  <fa
    :icon="['fas','bars']"
    class="toggle-icon toggle-icon-bars"
    :class="{ 'icon-hidden': isMobileMenuOpen }"
  />
  <fa
    :icon="['fas','times']"
    class="toggle-icon toggle-icon-times"
    :class="{ 'icon-visible': isMobileMenuOpen }"
  />
</div>
```

**CSS実装**:

```css
.toggle-icon-container {
  position: relative;
  width: 1.6rem;
  height: 1.6rem;
}

.toggle-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: opacity, transform;
}

/* 初期状態: bars表示、times非表示 */
.toggle-icon-bars {
  opacity: 1;
  transform: translate(-50%, -50%) rotate(0deg) scale(1);
}

.toggle-icon-times {
  opacity: 0;
  transform: translate(-50%, -50%) rotate(-90deg) scale(0.8);
}

/* メニューオープン時: bars非表示、times表示 */
.toggle-icon-bars.icon-hidden {
  opacity: 0;
  transform: translate(-50%, -50%) rotate(90deg) scale(0.8);
}

.toggle-icon-times.icon-visible {
  opacity: 1;
  transform: translate(-50%, -50%) rotate(0deg) scale(1);
}
```

**メリット**:
- CSS transitionのみで実装可能（軽量）
- 回転（90度）+ 透明度 + スケールで滑らかなモーフィング
- GPU加速で高パフォーマンス

### GPU加速とパフォーマンス最適化

#### 必須設定

```css
/* GPU加速の明示的な有効化 */
.mobile-page-title,
.mobile-menu-card,
.toggle-icon {
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: opacity, transform;
}

/* タッチ最適化 */
.mobile-toggle-button {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;
}
```

#### アクセシビリティ対応

```css
@media (prefers-reduced-motion: reduce) {
  .mobile-page-title,
  .mobile-menu-card,
  .toggle-icon,
  .mobile-menu-link {
    transition-duration: 0.05s !important;
    animation: none !important;
  }
}
```

### 実装チェックリスト

- [ ] アニメーション中、要素の最低opacity値は0.3以上
- [ ] z-indexが動的に制御されている
- [ ] onCompleteで状態リセットが実装されている
- [ ] アイコンが滑らかにクロスフェードする
- [ ] GPU加速が有効化されている（`will-change`, `translateZ(0)`）
- [ ] タッチ操作が最適化されている
- [ ] `prefers-reduced-motion` に対応している

## 関連ドキュメント

- `docs/standards/design-system.md`: デザインシステム
- `docs/standards/coding-standards.md`: コーディング規約
- `CLAUDE.md`: プロジェクト概要と開発コマンド
