export const logger = {
  debug: (msg: string) => {
    if (process.env.NODE_ENV !== "production") console.debug(`[DEBUG] ${msg}`);
  },
  info: (msg: string) => console.info(`[INFO] ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (msg: string, err?: any) => {
    console.error(`[ERROR] ${msg}`);
    if (err) console.error(err);
  },
};
