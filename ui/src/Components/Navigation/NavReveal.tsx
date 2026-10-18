import { useLayoutEffect, useRef, useState } from "react";
import { Box } from "@mantine/core";
import classes from "./Navigation.module.css";

type NavRevealProps = {
  opened: boolean;
  onRevealed?: () => void;
  children: React.ReactNode;
};

export function NavReveal({ opened, onRevealed, children }: NavRevealProps) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  const [motion, setMotion] = useState({
    opened,
    moving: false,
    revealing: false,
  });
  if (motion.opened !== opened) {
    setMotion({ opened, moving: true, revealing: opened });
  }

  useLayoutEffect(() => {
    const node = inner.current;
    if (!node) {
      return;
    }
    const measure = () => setHeight(node.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Box
      className={classes.reveal}
      style={{ height: opened ? height : 0 }}
      data-opened={opened || undefined}
      data-moving={motion.moving || undefined}
      inert={!opened}
      onTransitionRun={(event) => {
        if (event.target === event.currentTarget) {
          setMotion((state) => ({ ...state, moving: true }));
        }
      }}
      onTransitionEnd={(event) => {
        if (
          event.target !== event.currentTarget ||
          event.propertyName !== "height"
        ) {
          return;
        }
        if (motion.revealing) {
          onRevealed?.();
        }
        setMotion((state) => ({ ...state, moving: false, revealing: false }));
      }}
    >
      <Box ref={inner} className={classes.revealInner}>
        {children}
      </Box>
    </Box>
  );
}
