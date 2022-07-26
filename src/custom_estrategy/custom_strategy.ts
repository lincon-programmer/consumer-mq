import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { consumer_message } from 'src/mq-conect/brocker';

export class Consumer extends Server implements CustomTransportStrategy {
  listen(callback: () => void) {
    consumer_message();
    callback();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  close() {}
}
