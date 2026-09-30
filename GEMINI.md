# Animation & UI Guidelines — Antigravity Pair Programming

In this project, the **GreenSock Animation Platform (GSAP 3)** and its Club GreenSock plugins (located in `gsap-public/`) are the mandatory, standard animation library for all UI development, micro-interactions, scroll-driven storytelling, and kinetic typography.

## Core Rules

1. **Primary Engine**: Always use GSAP (`gsap`, `Timeline`, `ScrollTrigger`, `SplitText`, `Draggable`, `InertiaPlugin`, etc.) instead of ad-hoc CSS transitions or external light animation libraries whenever implementing interactive motion or UI reveals.
2. **Local Suite**: Reference the local suite in `gsap-public/minified/` (or `gsap-public/esm/` when bundling).
3. **Hardware Acceleration**: Always target GPU transforms (`x`, `y`, `xPercent`, `yPercent`, `scale`, `rotation`, `skewX`, `autoAlpha`).
4. **ScrollTrigger**: Use `ScrollTrigger` for all scroll-scrubbed tracks, pin states, progress indicators, and section reveal sequences.
5. **Draggable & Inertia**: Use `Draggable.create(..., { inertia: true, edgeResistance: ... })` for any pan/drag canvases or cards.
6. **Kinetic Typography**: Use `SplitText` with staggered character/word/line animations for editorial headings and section titles.
