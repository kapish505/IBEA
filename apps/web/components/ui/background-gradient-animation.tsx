"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { usePathname } from "next/navigation";

export const BackgroundGradientAnimation = ({
  firstColor = "100, 50, 255", // Deep purple
  secondColor = "0, 150, 255", // Deep blue
  thirdColor = "50, 255, 150", // Emerald/Safe
  fourthColor = "255, 50, 50", // Red/Semantic
  fifthColor = "150, 50, 255", // Purple
  pointerColor = "59, 130, 246", // Blue glow default
  size = "80%",
  blendingValue = "hard-light",
  children,
  className,
  interactive = true,
  containerClassName,
}: {
  gradientBackgroundStart?: string;
  gradientBackgroundEnd?: string;
  firstColor?: string;
  secondColor?: string;
  thirdColor?: string;
  fourthColor?: string;
  fifthColor?: string;
  pointerColor?: string;
  size?: string;
  blendingValue?: string;
  children?: React.ReactNode;
  className?: string;
  interactive?: boolean;
  containerClassName?: string;
}) => {
  const interactiveRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Use refs to store animation values instead of state
  const curXRef = useRef(0);
  const curYRef = useRef(0);
  const tgXRef = useRef(0);
  const tgYRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  const [isSafari, setIsSafari] = useState(false);

  // Force dark mode background colors to fix readability issues with white text
  const gradientBgStart = '#000000';
  const gradientBgEnd = '#0a0a0a';

  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 600], [1, 0]);
  
  // Interpolate pointer color from Blue (59, 130, 246) to Emerald (16, 185, 129)
  const pointerR = useTransform(scrollY, [0, 600], [59, 16]);
  const pointerG = useTransform(scrollY, [0, 600], [130, 185]);
  const pointerB = useTransform(scrollY, [0, 600], [246, 129]);

  // Interpolate background from White (255) to Black (0) on scroll
  const bgRGB = useTransform(scrollY, [0, 600], [255, 0]);

  useMotionValueEvent(scrollY, "change", () => {
    // Pointer color
    if (interactiveRef.current) {
      interactiveRef.current.style.setProperty(
        '--pointer-color', 
        `${Math.round(pointerR.get())}, ${Math.round(pointerG.get())}, ${Math.round(pointerB.get())}`
      );
    }
    
    // Background color
    const val = Math.round(bgRGB.get());
    const darkVal = Math.max(0, val - 10);
    document.body.style.setProperty('--gradient-background-start', `rgb(${val}, ${val}, ${val})`);
    document.body.style.setProperty('--gradient-background-end', `rgb(${darkVal}, ${darkVal}, ${darkVal})`);
  });

  // Initial CSS variables
  useEffect(() => {
    document.body.style.setProperty('--gradient-background-start', 'rgb(255, 255, 255)');
    document.body.style.setProperty('--gradient-background-end', 'rgb(245, 245, 245)');
    document.body.style.setProperty('--first-color', firstColor);
    document.body.style.setProperty('--second-color', secondColor);
    document.body.style.setProperty('--third-color', thirdColor);
    document.body.style.setProperty('--fourth-color', fourthColor);
    document.body.style.setProperty('--fifth-color', fifthColor);
    document.body.style.setProperty('--pointer-color', pointerColor);
    document.body.style.setProperty('--size', size);
    document.body.style.setProperty('--blending-value', blendingValue);
  }, [
    gradientBgStart,
    gradientBgEnd,
    firstColor,
    secondColor,
    thirdColor,
    fourthColor,
    fifthColor,
    pointerColor,
    size,
    blendingValue,
  ]);

  // Set up Safari detection
  useEffect(() => {
    setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
  }, []);

  // Set up animation loop
  useEffect(() => {
    if (!interactive) return;

    function animateMovement() {
      if (!interactiveRef.current) {
        animationFrameRef.current = requestAnimationFrame(animateMovement);
        return;
      }

      // Calculate new position with easing
      curXRef.current = curXRef.current + (tgXRef.current - curXRef.current) / 20;
      curYRef.current = curYRef.current + (tgYRef.current - curYRef.current) / 20;

      // Apply transform directly to DOM element
      interactiveRef.current.style.transform = `translate(${Math.round(curXRef.current)}px, ${Math.round(curYRef.current)}px)`;

      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(animateMovement);
    }

    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(animateMovement);

    // Clean up animation loop on unmount
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [interactive]);

  // Handle mouse movement globally to ensure tracking across the entire screen
  useEffect(() => {
    if (!interactive) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!interactiveRef.current) return;
      tgXRef.current = event.clientX;
      tgYRef.current = event.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [interactive]);

  if (pathname !== '/') {
    return (
      <div
        className={cn(
          'h-screen w-screen fixed inset-0 overflow-hidden bg-[#020202]',
          containerClassName
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.03)_0%,_transparent_60%)] pointer-events-none" />
        <div className={cn("relative z-10 w-full h-full", className)}>{children}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'h-screen w-screen fixed inset-0 overflow-hidden bg-[linear-gradient(40deg,var(--gradient-background-start),var(--gradient-background-end))]',
        containerClassName
      )}
    >
      <svg className="hidden">
        <defs>
          <filter id="blurMe">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <div className={cn("relative z-10 w-full h-full", className)}>{children}</div>
      <div
        className={cn(
          'gradients-container absolute inset-0 z-0 h-full w-full blur-lg',
          isSafari ? 'blur-2xl' : '[filter:url(#blurMe)_blur(40px)]'
        )}
      >
        <motion.div style={{ opacity }} className="absolute inset-0">
          <div
            className={cn(
              `absolute [background:radial-gradient(circle_at_center,_rgba(var(--first-color),_0.8)_0,_rgba(var(--first-color),_0)_50%)_no-repeat]`,
              `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
              `[transform-origin:center_center]`,
              `animate-first`,
              `opacity-100`
            )}
          ></div>
          <div
            className={cn(
              `absolute [background:radial-gradient(circle_at_center,_rgba(var(--second-color),_0.8)_0,_rgba(var(--second-color),_0)_50%)_no-repeat]`,
              `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
              `[transform-origin:calc(50%-400px)]`,
              `animate-second`,
              `opacity-100`
            )}
          ></div>
          <div
            className={cn(
              `absolute [background:radial-gradient(circle_at_center,_rgba(var(--third-color),_0.8)_0,_rgba(var(--third-color),_0)_50%)_no-repeat]`,
              `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
              `[transform-origin:calc(50%+400px)]`,
              `animate-third`,
              `opacity-100`
            )}
          ></div>
          <div
            className={cn(
              `absolute [background:radial-gradient(circle_at_center,_rgba(var(--fourth-color),_0.8)_0,_rgba(var(--fourth-color),_0)_50%)_no-repeat]`,
              `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
              `[transform-origin:calc(50%-200px)]`,
              `animate-fourth`,
              `opacity-70`
            )}
          ></div>
          <div
            className={cn(
              `absolute [background:radial-gradient(circle_at_center,_rgba(var(--fifth-color),_0.8)_0,_rgba(var(--fifth-color),_0)_50%)_no-repeat]`,
              `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
              `[transform-origin:calc(50%-800px)_calc(50%+800px)]`,
              `animate-fifth`,
              `opacity-100`
            )}
          ></div>
        </motion.div>

        {interactive && pathname === '/' && (
          <div
            ref={interactiveRef}
            className={cn(
              `fixed [background:radial-gradient(circle_at_center,_rgba(var(--pointer-color),_0.8)_0,_rgba(var(--pointer-color),_0)_50%)_no-repeat]`,
              `[mix-blend-mode:var(--blending-value)] w-[800px] h-[800px] -top-[400px] -left-[400px]`,
              `opacity-70 pointer-events-none`
            )}
          ></div>
        )}
      </div>
    </div>
  );
};
