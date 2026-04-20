import { OnQueueFailed, Process, Processor } from "@nestjs/bull";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bull";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InventoryService } from "../inventory/inventory.service";
import { PaymentsService } from "../payments/payments.service";
import { Order } from "../orders/entities/order.entity";
import { OrderStatus } from "../common/enums/order-status.enum";
import { QueueService } from "./queue.service";
import { ORDER_PROCESSING_QUEUE } from "./queue.constants";

@Injectable()
@Processor(ORDER_PROCESSING_QUEUE)
export class OrderProcessor {
  private readonly logger = new Logger(OrderProcessor.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly paymentsService: PaymentsService,
    private readonly inventoryService: InventoryService,
    private readonly queueService: QueueService,
  ) {}

  @Process("process")
  async handleOrderProcessing(job: Job<{ orderId: string }>) {
    this.logger.log(`Processing order ${job.data.orderId}`);
    const order = await this.orderRepository.findOne({
      where: { id: job.data.orderId },
      relations: ["items"],
    });
    if (!order) {
      this.logger.warn(`Order ${job.data.orderId} not found`);
      return;
    }
    if (order.status !== OrderStatus.CREATED) {
      this.logger.log(
        `Order ${order.id} already handled with status ${order.status}`,
      );
      return;
    }

    const paymentResult = await this.paymentsService.simulatePayment(order);
    if (paymentResult.success) {
      order.status = OrderStatus.PAID;
      await this.orderRepository.save(order);
      await this.queueService.enqueueOrderShipping(order.id);
      this.logger.log(
        `Order ${order.id} payment succeeded and shipped job queued`,
      );
      return;
    }

    await this.inventoryService.releaseInventory(order.id);
    order.status = OrderStatus.PAYMENT_FAILED;
    await this.orderRepository.save(order);
    this.logger.warn(`Order ${order.id} payment failed and inventory released`);
  }

  @OnQueueFailed()
  async handleFailed(job: Job, error: Error) {
    if (job.queue.name !== ORDER_PROCESSING_QUEUE) {
      return;
    }
    const attempts = job.attemptsMade;
    const maxAttempts = job.opts.attempts || 3;
    this.logger.error(
      `Order processing job ${job.id} failed (${attempts}/${maxAttempts}): ${error.message}`,
    );
    if (attempts >= maxAttempts) {
      await this.queueService.sendToDeadLetter(job.data, error.message);
      this.logger.error(`Job ${job.id} moved to dead-letter queue`);
    }
  }
}
