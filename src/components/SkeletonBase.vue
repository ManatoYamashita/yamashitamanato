<template>
  <div class="skeleton-base" :style="computedStyle"></div>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';

interface Props {
  width?: string;
  height?: string;
  aspectRatio?: string;
  borderRadius?: string;
  rounded?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  width: '100%',
  height: '1rem',
  aspectRatio: undefined,
  borderRadius: '0.5rem',
  rounded: false,
});

const computedStyle = computed<CSSProperties>(() => {
  const style: CSSProperties = {
    width: props.width,
    borderRadius: props.rounded ? '9999px' : props.borderRadius,
  };

  if (props.aspectRatio) {
    style.aspectRatio = props.aspectRatio;
  } else {
    style.height = props.height;
  }

  return style;
});
</script>

<style scoped>
.skeleton-base {
  background-color: #e0e0e0;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-base {
    animation: none;
    opacity: 0.6;
  }
}
</style>
