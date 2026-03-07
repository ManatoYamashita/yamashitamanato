import { ref, nextTick, onMounted } from 'vue';
import type { Ref } from 'vue';
import type { Router } from 'vue-router';

interface UseMobileMenuAnimationOptions {
  router: Router;
  isDropdownOpen: Ref<boolean>;
  pageTitleRef: Ref<HTMLElement | null>;
  menuCardRef: Ref<HTMLElement | null>;
}

export function useMobileMenuAnimation(options: UseMobileMenuAnimationOptions) {
  const isMobileMenuOpen = ref(false);
  const isAnimating = ref(false);

  // GSAP 動的 import キャッシュ
  let gsapInstance: typeof import('gsap').gsap | null = null;

  const loadGsap = async () => {
    if (!gsapInstance) {
      const mod = await import('gsap');
      gsapInstance = mod.gsap;
    }
    return gsapInstance;
  };

  const handleMorphButtonClick = async (): Promise<void> => {
    if (isAnimating.value) return;

    const gsap = await loadGsap();
    isAnimating.value = true;
    const willOpen = !isMobileMenuOpen.value;

    if (willOpen) {
      isMobileMenuOpen.value = true;

      nextTick(() => {
        const tl = gsap.timeline({
          defaults: { ease: 'power2.out' },
          onComplete: () => {
            isAnimating.value = false;
          },
        });
        if (options.pageTitleRef.value) {
          tl.to(options.pageTitleRef.value, {
            opacity: 0.3,
            scale: 0.92,
            y: 0,
            zIndex: 1,
            duration: 0.2,
          });
        }
        if (options.menuCardRef.value) {
          tl.to(
            options.menuCardRef.value,
            {
              opacity: 1,
              y: 0,
              scale: 1,
              zIndex: 5,
              duration: 0.25,
              ease: 'back.out(1.2)',
            },
            '-=0.1'
          );
        }
      });
    } else {
      const tl = gsap.timeline({
        defaults: { ease: 'power2.in' },
        onComplete: () => {
          isMobileMenuOpen.value = false;
          isAnimating.value = false;

          if (options.pageTitleRef.value) {
            gsap.set(options.pageTitleRef.value, {
              opacity: 1,
              scale: 1,
              y: 0,
              zIndex: 5,
            });
          }
          if (options.menuCardRef.value) {
            gsap.set(options.menuCardRef.value, {
              opacity: 0,
              y: 8,
              scale: 0.95,
              zIndex: 1,
            });
          }
        },
      });
      if (options.menuCardRef.value) {
        tl.to(options.menuCardRef.value, {
          opacity: 0.3,
          y: 12,
          scale: 0.95,
          zIndex: 1,
          duration: 0.2,
        });
      }
      if (options.pageTitleRef.value) {
        tl.to(
          options.pageTitleRef.value,
          {
            opacity: 1,
            scale: 1,
            y: 0,
            zIndex: 5,
            duration: 0.25,
            ease: 'back.out(1.3)',
          },
          '-=0.12'
        );
      }
    }
  };

  onMounted(async () => {
    await loadGsap();

    options.router.afterEach(() => {
      options.isDropdownOpen.value = false;
      if (isMobileMenuOpen.value) {
        isMobileMenuOpen.value = false;
        nextTick(() => {
          if (gsapInstance && options.pageTitleRef.value) {
            gsapInstance.set(options.pageTitleRef.value, { opacity: 1, scale: 1 });
          }
          if (gsapInstance && options.menuCardRef.value) {
            gsapInstance.set(options.menuCardRef.value, { opacity: 0, y: 8 });
          }
        });
      }
    });
  });

  return {
    isMobileMenuOpen,
    handleMorphButtonClick,
  };
}
