import { InjectQueue } from "@nestjs/bull";
import { Injectable } from "@nestjs/common";
import { Queue } from "bull";
import {
  ORDER_DLQ_QUEUE,
  ORDER_PROCESSING_QUEUE,
  ORDER_SHIPPING_QUEUE,
} from "./queue.constants";

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(ORDER_PROCESSING_QUEUE)
    private readonly orderProcessingQueue: Queue,
    @InjectQueue(ORDER_SHIPPING_QUEUE)
    private readonly orderShippingQueue: Queue,
    @InjectQueue(ORDER_DLQ_QUEUE)
    private readonly deadLetterQueue: Queue,
  ) {}

  enqueueOrderProcessing(orderId: string) {
    return this.orderProcessingQueue.add("process", { orderId });
  }

  enqueueOrderShipping(orderId: string) {
    return this.orderShippingQueue.add("ship", { orderId }, { delay: 2000 });
  }

  sendToDeadLetter(payload: unknown, reason: string) {
    return this.deadLetterQueue.add("dead-letter", { payload, reason });
  }
}
