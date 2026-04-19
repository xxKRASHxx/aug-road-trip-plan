// Thin passthrough so `node scripts/build-route.mjs` works from the repo root.
// The real builder lives under web/ (the Angular workspace). It resolves its
// output path from its own __dirname, so importing from here is safe.
import '../web/scripts/build-route.mjs';
