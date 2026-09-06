/// <reference types="vite/client" />

// Vue SFC type declaration
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  // Vue 公式が案内する SFC シムの形。any を外すと任意の SFC が代入できなくなる。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Image imports type declaration
declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

// JSON imports type declaration
declare module '*.json' {
  // JSON の形状は import 先ごとに異なる。unknown にすると i18n の
  // setLocaleMessage など既存の受け渡しが型エラーになるため any を許容する。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value: any;
  export default value;
}

// Vite environment variables
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// requestIdleCallback type definition (for browser API)
interface Window {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
}
