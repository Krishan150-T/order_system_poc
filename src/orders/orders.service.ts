import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, Repository } from "typeorm";
import { InventoryService } from "../inventory/inventory.service";
import { Product } from "../inventory/entities/product.entity";
import { QueueService } from "../queue/queue.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { Order } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import { OrderStatus } from "../common/enums/order-status.enum";
import { IdempotencyService } from "../common/services/idempotency.service";

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly inventoryService: InventoryService,
    private readonly queueService: QueueService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto, idempotencyKey?: string) {
    if (!idempotencyKey) {
      throw new BadRequestException("Idempotency key is required");
    }

    const requestHash =
      await this.idempotencyService.computeRequestHash(createOrderDto);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingKey = await this.idempotencyService.registerPendingKey(
        idempotencyKey,
        requestHash,
      );

      if (existingKey.status === "COMPLETED" && existingKey.responseData) {
        await queryRunner.rollbackTransaction();
        return JSON.parse(existingKey.responseData);
      }
      if (existingKey.status === "PENDING") {
        await queryRunner.rollbackTransaction();
        throw new ConflictException(
          "Order is already being processed for this idempotency key",
        );
      }

      const order = this.orderRepository.create({
        customerId: createOrderDto.customerId,
        paymentMethod: createOrderDto.paymentMethod,
        status: OrderStatus.CREATED,
        totalAmount: 0,
        idempotencyKey,
      });
      const savedOrder = await queryRunner.manager.save(order);

      let totalAmount = 0;
      const items: OrderItem[] = [];
      for (const itemDto of createOrderDto.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: itemDto.productId },
        });
        if (!product) {
          throw new BadRequestException(
            `Product ${itemDto.productId} not found`,
          );
        }

        const unitPrice = Number(product.price);
        totalAmount += unitPrice * itemDto.quantity;

        const orderItem = this.orderItemRepository.create({
          order: savedOrder,
          productId: itemDto.productId,
          quantity: itemDto.quantity,
          unitPrice,
        });
        items.push(orderItem);
      }

      await queryRunner.manager.save(items);
      await this.inventoryService.reserveInventory(
        queryRunner.manager,
        savedOrder.id,
        createOrderDto.items,
      );

      savedOrder.totalAmount = totalAmount;
      savedOrder.items = items;
      await queryRunner.manager.save(savedOrder);

      const response = {
        orderId: savedOrder.id,
        status: savedOrder.status,
        totalAmount: savedOrder.totalAmount,
        items: savedOrder.items,
      };

      await this.idempotencyService.completeKey(idempotencyKey, response);
      await queryRunner.commitTransaction();
      await this.queueService.enqueueOrderProcessing(savedOrder.id);
      return response;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof ConflictException) {
        throw error;
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findOrder(orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ["items"],
    });
    if (!order) {
      throw new BadRequestException("Order not found");
    }
    return order;
  }

  async shipOrder(orderId: string) {
    const order = await this.findOrder(orderId);
    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException("Only PAID orders can be shipped");
    }
    order.status = OrderStatus.SHIPPED;
    return this.orderRepository.save(order);
  }

  async deliverOrder(orderId: string) {
    const order = await this.findOrder(orderId);
    if (order.status !== OrderStatus.SHIPPED) {
      throw new BadRequestException("Only SHIPPED orders can be delivered");
    }
    order.status = OrderStatus.DELIVERED;
    return this.orderRepository.save(order);
  }
}
