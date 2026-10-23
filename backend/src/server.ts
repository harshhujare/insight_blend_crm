import { app } from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.info(`🚀 Insight Blend API running on port ${env.PORT} [${env.NODE_ENV}]`);
});

export default server;
