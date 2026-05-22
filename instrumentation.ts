export async function register() {
  if (typeof window === "undefined") {
    const store = new Map<string, string>();
    const localStorageShim = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => { store.clear(); },
      get length() { return store.size; },
      key: (i: number) => [...store.keys()][i] ?? null,
    };
    Object.defineProperty(global, "localStorage", {
      value: localStorageShim,
      writable: true,
      configurable: true,
    });
  }
}
