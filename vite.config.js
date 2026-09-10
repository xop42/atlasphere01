import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [
    {
      name: 'html-transform',
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          return html.replace(
            '<script src="./app.js"></script>',
            '<script type="module" src="./app.js"></script>'
          );
        }
      }
    }
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 8085,
    open: false,
  },
});
