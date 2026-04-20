import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InventoryModule } from "../inventory/inventory.module";
import { PaymentsModule } from "../payments/payments.module";
import { QueueService } from "./queue.service";
import { OrderProcessor } from "./order.processor";
import { ShippingProcessor } from "./shipping.processor";
import { Order } from "../orders/entities/order.entity";
import {
  ORDER_DLQ_QUEUE,
  ORDER_PROCESSING_QUEUE,
  ORDER_SHIPPING_QUEUE,
} from "./queue.constants";

@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: ORDER_PROCESSING_QUEUE,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
        },
      },
      { name: ORDER_SHIPPING_QUEUE },
      { name: ORDER_DLQ_QUEUE },
    ),
    TypeOrmModule.forFeature([Order]),
    InventoryModule,
    PaymentsModule,
  ],
  providers: [QueueService, OrderProcessor, ShippingProcessor],
  exports: [QueueService],
})
export class QueueModule {}
