import { Process, Processor } from "@nestjs/bull";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bull";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Order } from "../orders/entities/order.entity";
import { OrderStatus } from "../common/enums/order-status.enum";
import { ORDER_SHIPPING_QUEUE } from "./queue.constants";

@Injectable()
@Processor(ORDER_SHIPPING_QUEUE)
export class ShippingProcessor {
  private readonly logger = new Logger(ShippingProcessor.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  @Process("ship")
  async handleShipping(job: Job<{ orderId: string }>) {
    this.logger.log(`Shipping order ${job.data.orderId}`);
    const order = await this.orderRepository.findOne({
      where: { id: job.data.orderId },
    });
    if (!order) {
      this.logger.warn(
        `Order ${job.data.orderId} not found in shipping processor`,
      );
      return;
    }
    if (order.status !== OrderStatus.PAID) {
      this.logger.warn(
        `Order ${order.id} cannot ship in status ${order.status}`,
      );
      return;
    }
    order.status = OrderStatus.SHIPPED;
    await this.orderRepository.save(order);
    this.logger.log(`Order ${order.id} shipped`);
  }
}
