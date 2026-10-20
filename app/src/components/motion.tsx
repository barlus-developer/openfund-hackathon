import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const reducedMotion = "(prefers-reduced-motion: reduce)";

/** Animate navigation without keying/remounting forms, wallets or transactions. */
export function RouteSurface({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element?.animate || !window.matchMedia) return;
    const preference = window.matchMedia(reducedMotion);
    if (preference.matches) return;
    const animation = element.animate(
      [
        { opacity: 0.4, transform: "translateY(8px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 280, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
    const cancel = () => animation.cancel();
    preference.addEventListener("change", cancel);
    element.addEventListener("focusin", cancel);
    return () => {
      animation.cancel();
      preference.removeEventListener("change", cancel);
      element.removeEventListener("focusin", cancel);
    };
  }, [pathname]);
  return (
    <div ref={ref} className="route-surface">
      {children}
    </div>
  );
}

/** One entrance per section. Content stays visible if observation is unavailable. */
export function Reveal({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !window.matchMedia || !("IntersectionObserver" in window))
      return;
    const preference = window.matchMedia(reducedMotion);
    if (preference.matches) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          element.dataset.revealed = "true";
          observer.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    observer.observe(element);
    const finish = () => {
      observer.disconnect();
      delete element.dataset.revealed;
    };
    preference.addEventListener("change", finish);
    element.addEventListener("focusin", finish);
    return () => {
      finish();
      preference.removeEventListener("change", finish);
      element.removeEventListener("focusin", finish);
    };
  }, []);
  return (
    <div ref={ref} className={cn("reveal", className)} {...props}>
      {children}
    </div>
  );
}
