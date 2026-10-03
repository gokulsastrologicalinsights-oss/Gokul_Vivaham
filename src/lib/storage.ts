export const storageLib = {
  saveLocal: (key: string, v: any) => localStorage.setItem(key, JSON.stringify(v))
};
