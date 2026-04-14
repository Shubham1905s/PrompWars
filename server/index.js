import { createPlatformServer } from './app.js';

const PORT = Number(process.env.PORT ?? 5000);

const { httpServer } = await createPlatformServer();

httpServer.listen(PORT, () => {
  console.log(`VenueFlow server listening on http://localhost:${PORT}`);
});
