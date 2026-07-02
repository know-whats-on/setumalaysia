if (typeof window !== 'undefined' && !(window as any).__publicField) {
  const __publicField = function (obj: any, key: any, value: any) {
    Object.defineProperty(obj, key, { enumerable: true, configurable: true, writable: true, value });
  };
  (window as any).__publicField = __publicField;
  (globalThis as any).__publicField = __publicField;
}

// Ensure it's defined globally for bare variable references
if (typeof globalThis !== 'undefined' && !(globalThis as any).__publicField) {
  (globalThis as any).__publicField = function (obj: any, key: any, value: any) {
    Object.defineProperty(obj, key, { enumerable: true, configurable: true, writable: true, value });
  };
}
