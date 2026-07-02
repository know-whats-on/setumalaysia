export function getKeyboardAwareSheetStyle(maxHeightPx: number) {
  return {
    maxHeight: `min(${maxHeightPx}px, calc(100dvh - var(--native-safe-area-top) - 0.5rem))`,
  } as const;
}

export function getKeyboardAwareLargeSheetStyle(maxHeightPx: number) {
  const bottomClearance = 'max(var(--app-bottom-nav-clearance), var(--app-keyboard-inset))';
  const computedHeight = `min(${maxHeightPx}px, calc(100dvh - var(--native-safe-area-top) - ${bottomClearance} - 0.5rem))`;
  return {
    bottom: bottomClearance,
    height: computedHeight,
    maxHeight: computedHeight,
  } as const;
}

export const keyboardAwareSheetBodyStyle = {
  paddingBottom: '1rem',
  scrollPaddingBottom: 'calc(var(--app-keyboard-inset) + 7rem)',
} as const;

export const keyboardAwareSheetFooterStyle = {
  paddingBottom: 'max(calc(var(--native-safe-area-bottom) + 1rem), calc(var(--app-keyboard-inset) + 0.75rem))',
} as const;

export const keyboardAwareLargeSheetBodyStyle = {
  paddingBottom: 'calc(var(--native-safe-area-bottom) + 7.5rem)',
  scrollPaddingBottom: 'calc(var(--native-safe-area-bottom) + 10rem)',
} as const;

export const keyboardAwareLargeSheetFooterStyle = {
  paddingBottom: 'calc(var(--native-safe-area-bottom) + 0.75rem)',
} as const;

export const keyboardAwareInlineScrollStyle = {
  paddingBottom: 'max(calc(var(--app-bottom-nav-clearance) + 1rem), calc(var(--app-keyboard-inset) + 1rem))',
  scrollPaddingBottom: 'calc(var(--app-keyboard-inset) + 7rem)',
} as const;

export const keyboardAwareNestedScrollStyle = {
  paddingBottom: 'max(1rem, calc(var(--app-keyboard-inset) + 1rem))',
  scrollPaddingBottom: 'calc(var(--app-keyboard-inset) + 7rem)',
} as const;

export const keyboardAwareModalPaddingStyle = {
  paddingBottom: 'max(1rem, calc(var(--app-keyboard-inset) + 1rem))',
} as const;

export const emailFieldProps = {
  inputMode: 'email' as const,
  autoCapitalize: 'none' as const,
  autoCorrect: 'off' as const,
  spellCheck: false,
};

export const urlFieldProps = {
  inputMode: 'url' as const,
  autoCapitalize: 'none' as const,
  autoCorrect: 'off' as const,
  spellCheck: false,
};

export const codeFieldProps = {
  inputMode: 'text' as const,
  autoCapitalize: 'characters' as const,
  autoCorrect: 'off' as const,
  spellCheck: false,
};

export const decimalFieldProps = {
  inputMode: 'decimal' as const,
} as const;

export const numericFieldProps = {
  inputMode: 'numeric' as const,
} as const;
