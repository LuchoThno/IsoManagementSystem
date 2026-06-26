import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getAllowedOrigins } from './config/cors';

async function bootstrap() {
  const bodyParser = require('body-parser');
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().get('/api/health', (_request: unknown, response: any) => {
    response.status(200).json({ status: 'ok' });
  });
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(bodyParser.json({ limit: '25mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '25mb' }));
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: getAllowedOrigins(),
    credentials: true,
  });

  const port = Number(process.env.PORT || 3001);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
