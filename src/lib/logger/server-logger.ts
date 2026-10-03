export const serverLogger = {
  info(message: string, metadata?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    console.log(JSON.stringify({ timestamp, level: 'INFO', context: 'SERVER', message, ...metadata }));
  },
  warn(message: string, metadata?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    console.warn(JSON.stringify({ timestamp, level: 'WARN', context: 'SERVER', message, ...metadata }));
  },
  error(message: string, error?: any, metadata?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    console.error(
      JSON.stringify({
        timestamp,
        level: 'ERROR',
        context: 'SERVER',
        message,
        error: error?.message || error || 'Unknown Error',
        stack: error?.stack,
        ...metadata,
      })
    );
  },
};
