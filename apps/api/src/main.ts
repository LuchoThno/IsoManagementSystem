import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const bodyParser = require('body-parser');
  const app = await NestFactory.create(AppModule);
  app.use(bodyParser.json({ limit: '25mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '25mb' }));
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = Number(process.env.PORT || 3001);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
