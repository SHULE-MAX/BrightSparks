import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The Supabase settings are delivered to the browser at RUNTIME by /config.js
// rather than being baked into the built JavaScript. That means the same build
// works against any Supabase project, and changing a key on Railway only needs
// a restart, not a rebuild.
//
// In production server.js serves /config.js. In development this plugin does
// the same job, reading admin/.env instead.
function runtimeConfig(env) {
  return {
    name: 'bsjs-runtime-config',
    configureServer(server) {
      server.middlewares.use('/config.js', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript');
        res.end(
          `window.__BSJS_CONFIG__ = ${JSON.stringify({
            supabaseUrl: env.SUPABASE_URL || '',
            supabaseAnonKey: env.SUPABASE_ANON_KEY || '',
            siteUrl: env.SITE_URL || 'https://brightsparksjunior.ac.ug',
          })};`
        );
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), runtimeConfig(env)],
    server: { port: 5173 },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          // Split the big third-party libraries out of the app bundle. They
          // change far less often than the dashboard code, so returning staff
          // keep them cached instead of re-downloading on every deploy.
          manualChunks: {
            charts: ['recharts'],
            supabase: ['@supabase/supabase-js'],
            react: ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
    },
  };
});
