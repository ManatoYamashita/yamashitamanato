import { ref, nextTick } from 'vue';
import type { Ref } from 'vue';

interface UseIntroAnimationOptions {
  isHomePage: Ref<boolean>;
  splashOverlayRef: Ref<HTMLDivElement | null>;
  splashLogoRef: Ref<HTMLImageElement | null>;
  centerLogoRef: Ref<HTMLImageElement | null>;
  homeNavRef: Ref<HTMLElement | null>;
}

export function useIntroAnimation(options: UseIntroAnimationOptions) {
  const showSplash = ref(true);
  const introComplete = ref(false);
  const revealComplete = ref(false);

  const playRevealStagger = (gsap: typeof import('gsap').gsap): void => {
    const targets: Element[] = [];

    if (options.centerLogoRef.value) {
      targets.push(options.centerLogoRef.value);
    }
    if (options.homeNavRef.value) {
      targets.push(...Array.from(options.homeNavRef.value.children));
    }

    if (targets.length === 0) return;

    // CSS transition を無効化してGSAPとの競合を防止
    targets.forEach((el) => {
      (el as HTMLElement).style.transition = 'none';
    });

    gsap.fromTo(
      targets,
      { opacity: 0, y: -30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out',
        stagger: 0.12,
        onComplete: () => {
          // CSS transition を復元（ホバーエフェクト等に必要）
          targets.forEach((el) => {
            (el as HTMLElement).style.transition = '';
          });
          revealComplete.value = true;
        },
      },
    );
  };

  const playIntroAnimation = async (): Promise<void> => {
    if (introComplete.value || !options.splashOverlayRef.value || !options.splashLogoRef.value) {
      showSplash.value = false;
      introComplete.value = true;
      revealComplete.value = true;
      return;
    }

    const { gsap } = await import('gsap');
    const tl = gsap.timeline({
      onComplete: () => {
        showSplash.value = false;
        introComplete.value = true;

        void nextTick().then(() => {
          playRevealStagger(gsap);
        });
      },
    });

    // Phase 1: 黄色レイヤー上にロゴがフェードイン
    tl.fromTo(
      options.splashLogoRef.value,
      { opacity: 0, scale: 0.92 },
      { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' },
    )
    // Phase 2: ロゴフェードアウト → レイヤースライドアウト
    .to(options.splashLogoRef.value, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
      delay: 0.3,
    })
    .to(options.splashOverlayRef.value, {
      yPercent: -100,
      duration: 0.7,
      ease: 'power3.inOut',
    });
  };

  // 初期化（onMounted から呼ぶ）
  const initAnimation = (): void => {
    if (options.isHomePage.value) {
      playIntroAnimation();
    } else {
      showSplash.value = false;
      introComplete.value = true;
      revealComplete.value = true;
    }
  };

  // ホームに戻った場合のスキップ処理
  const skipIntroIfNeeded = (): void => {
    if (options.isHomePage.value && !introComplete.value) {
      introComplete.value = true;
      revealComplete.value = true;
    }
  };

  return {
    showSplash,
    introComplete,
    revealComplete,
    initAnimation,
    skipIntroIfNeeded,
  };
}
