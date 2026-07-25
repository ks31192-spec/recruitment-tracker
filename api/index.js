let app;
try {
  app = (await import('../server/index.js')).default;
} catch (e) {
  const express = (await import('express')).default;
  app = express();
  const msg = { error: e.message, stack: e.stack };
  app.use((_req, res) => res.status(500).json(msg));
}
export default app;
