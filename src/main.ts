import { Consumer } from './custom_estrategy/custom_strategy';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      strategy: new Consumer(),
    },
  );
  await app.listen();
}
bootstrap();
