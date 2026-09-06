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
  // SSG/SSRプリレンダ段階では onMounted（initAnimation）が走らず、初期値がそのまま
  // 生成HTMLへ出力される。ホーム以外で true のままだと全画面オーバーレイが焼き込まれ、
  // JS未実行時に本文が覆い隠されるため、isHomePage から同期初期化する。
  const showSplash = ref(options.isHomePage.value);
  const introComplete = ref(false);
  const revealComplete = ref(false);

  const prefersReducedMotion = (): boolean =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const playRevealStagger = (
    gsap: typeof import('gsap').gsap,
    targets: Element[],
    onDone?: () => void,
  ): void => {
    if (targets.length === 0) {
      onDone?.();
      return;
    }

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
          onDone?.();
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

    // reduced-motion: アニメーションをスキップして即最終状態
    if (prefersReducedMotion()) {
      showSplash.value = false;
      introComplete.value = true;
      revealComplete.value = true;
      return;
    }

    const logoEl = options.splashLogoRef.value;
    const overlayEl = options.splashOverlayRef.value;

    const { gsap } = await import('gsap');

    // 導入フェード（.splash-logo の splash-logo-in）は CSS が担当する。
    // 実行中の CSS アニメーションはインラインスタイルより優先されるため、
    // 完了を待たずに GSAP で opacity を触ると Phase 2 が打ち消される。
    if (typeof logoEl.getAnimations === 'function') {
      await Promise.all(logoEl.getAnimations().map((anim) => anim.finished.catch(() => undefined)));
    }
    // 完了後は fill による保持を解除し、以降の制御を GSAP へ明け渡す。
    logoEl.style.animation = 'none';

    const tl = gsap.timeline({
      onComplete: () => {
        showSplash.value = false;
        // ロゴのリビールはスライドアウト完了後（元のタイミング）
        const logoTargets = options.centerLogoRef.value ? [options.centerLogoRef.value] : [];
        playRevealStagger(gsap, logoTargets, () => {
          revealComplete.value = true;
        });
      },
    });

    // Phase 2: ロゴフェードアウト → レイヤースライドアウト
    // （Phase 1 のフェードインは CSS の splash-logo-in が担当する）
    tl.to(logoEl, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
      delay: 0.3,
    })
    .to(overlayEl, {
      yPercent: -100,
      duration: 0.7,
      ease: 'power3.inOut',
    })
    // スライドアウト開始と同時にナビのみ先行リビール（ロゴは元タイミング維持）
    .call(() => {
      // v-show解除時の一瞬のopacity:1表示を防ぐため、事前に初期状態を焼き付ける
      if (options.homeNavRef.value) {
        gsap.set(Array.from(options.homeNavRef.value.children), { opacity: 0, y: -30 });
      }
      introComplete.value = true;
      void nextTick().then(() => {
        const navTargets = options.homeNavRef.value
          ? Array.from(options.homeNavRef.value.children)
          : [];
        playRevealStagger(gsap, navTargets);
      });
    }, [], '<');
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
