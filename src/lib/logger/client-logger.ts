const isProduction = process.env.NODE_ENV === 'production';

export const clientLogger = {
  info(message: string, ...args: any[]) {
    if (!isProduction) {
      console.log(`[INFO] [CLIENT] ${message}`, ...args);
    }
  },
  warn(message: string, ...args: any[]) {
    console.warn(`[WARN] [CLIENT] ${message}`, ...args);
  },
  error(message: string, error?: any, ...args: any[]) {
    console.error(`[ERROR] [CLIENT] ${message}`, error || '', ...args);
  },
  debug(message: string, ...args: any[]) {
    if (!isProduction) {
      console.debug(`[DEBUG] [CLIENT] ${message}`, ...args);
    }
  },
};
