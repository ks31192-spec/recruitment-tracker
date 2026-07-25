let handler;

export default async function (req, res) {
  try {
    if (!handler) {
      const mod = await import('../server/index.js');
      handler = mod.default;
    }
    return handler(req, res);
  } catch (e) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
}
