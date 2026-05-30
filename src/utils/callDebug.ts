const enabled = __DEV__;

export const callDebug = {
  log(tag: string, ...args: unknown[]) {
    if (enabled) console.log(`[Call:${tag}]`, ...args);
  },
  warn(tag: string, ...args: unknown[]) {
    if (enabled) console.warn(`[Call:${tag}]`, ...args);
  },
  error(tag: string, ...args: unknown[]) {
    console.error(`[Call:${tag}]`, ...args);
  },
};
