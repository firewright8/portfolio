export type PageTypographyProps = {
  headingFont?: string;
  bodyFont?: string;
  headingWeight?: string | number;
  bodyWeight?: string | number;
  primaryColor?: string;
  headingSize?: number;
  bodySize?: number;
  headingLetterSpacing?: number;
};

export type LandingPageCustomization = {
  css: string;
  primaryColor?: string;
  headingFont?: string;
  bodyFont?: string;
  headingWeight?: string | number;
  bodyWeight?: string | number;
  headingSize?: number;
  bodySize?: number;
  headingLetterSpacing?: number;
};

const TYPOGRAPHY_KEYS = new Set([
  "headingFont",
  "bodyFont",
  "headingWeight",
  "bodyWeight",
  "primaryColor",
  "headingSize",
  "bodySize",
  "headingLetterSpacing",
]);

export function splitTypographyProps<T extends Record<string, any>>(
  props: T,
): [PageTypographyProps, Omit<T, keyof PageTypographyProps>] {
  const typeProps: Record<string, any> = {};
  const frameProps: Record<string, any> = {};
  for (const [key, value] of Object.entries(props)) {
    if (TYPOGRAPHY_KEYS.has(key)) {
      typeProps[key] = value;
    } else {
      frameProps[key] = value;
    }
  }
  return [typeProps as PageTypographyProps, frameProps as Omit<T, keyof PageTypographyProps>];
}

const FONT_MAP: Record<string, string> = {
  "iowan-old-style": '"Iowan Old Style", "Baskerville", "Times New Roman", serif',
  "inter": '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  "space-grotesk": '"Space Grotesk", sans-serif',
  "syne": '"Syne", sans-serif',
  "garamond": '"Garamond", "Georgia", serif',
};

export function usePageTypography(
  recipe: PageTypographyProps = {},
  userProps: PageTypographyProps = {},
): LandingPageCustomization {
  const merged = { ...recipe, ...userProps };
  const headingFont = FONT_MAP[merged.headingFont || ""] || merged.headingFont || '"Iowan Old Style", serif';
  const bodyFont = FONT_MAP[merged.bodyFont || ""] || merged.bodyFont || '"Inter", sans-serif';
  const primaryColor = merged.primaryColor || "#c87046";
  const headingSize = merged.headingSize;
  const bodySize = merged.bodySize;
  const headingLetterSpacing = merged.headingLetterSpacing;

  let css = `
    :root {
      --serif: ${headingFont} !important;
      --mono: ${bodyFont} !important;
      --accent: ${primaryColor} !important;
  `;
  if (headingSize) css += `  --heading-size: ${headingSize}px !important;\n`;
  if (bodySize) css += `  --body-size: ${bodySize}px !important;\n`;
  if (headingLetterSpacing !== undefined) css += `  --heading-letter-spacing: ${headingLetterSpacing}em !important;\n`;
  css += `}\n`;

  return {
    css,
    primaryColor,
    headingFont,
    bodyFont,
    headingWeight: merged.headingWeight,
    bodyWeight: merged.bodyWeight,
    headingSize,
    bodySize,
    headingLetterSpacing,
  };
}

export function applyPageCustomization(
  frame: HTMLIFrameElement | null,
  customization?: LandingPageCustomization,
) {
  if (!frame || !customization) return;
  try {
    const doc = frame.contentDocument;
    if (!doc) return;

    let style = doc.getElementById("threeui-page-customization") as HTMLStyleElement;
    if (!style) {
      style = doc.createElement("style");
      style.id = "threeui-page-customization";
      doc.head.appendChild(style);
    }
    style.textContent = customization.css;

    if (customization.primaryColor) {
      doc.documentElement.style.setProperty("--accent", customization.primaryColor);
    }
    if (customization.headingFont) {
      doc.documentElement.style.setProperty("--serif", customization.headingFont);
    }
    if (customization.bodyFont) {
      doc.documentElement.style.setProperty("--mono", customization.bodyFont);
    }
  } catch (e) {
    // Cross-origin fallback handled via postMessage
  }
}

export function postPageCustomization(
  frame: HTMLIFrameElement | null,
  customization?: LandingPageCustomization,
) {
  if (!frame || !customization) return;
  try {
    frame.contentWindow?.postMessage(
      { type: "threeui-page-customization", customization },
      "*",
    );
  } catch (e) {
    // ignore
  }
}
