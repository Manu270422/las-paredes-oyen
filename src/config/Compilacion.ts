// Aquí está la versión de esta compilación: la de package.json y el commit de donde salió. Vercel da el commit
// al compilar (VERCEL_GIT_COMMIT_SHA) y vite.config.ts lo inyecta. Sin ese dato (en local, o si Vercel no lo
// expone) dice "+local". Va en la telemetría y en el pie del menú, para saber qué versión jugó cada probador.
declare const __COMPILACION__: string | undefined;

export const COMPILACION: string = typeof __COMPILACION__ === 'string' ? __COMPILACION__ : 'local';
