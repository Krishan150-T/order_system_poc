import { BadRequestException, Injectable } from "@nestjs/common";
import { EntityManager, In, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import {
  InventoryReservation,
  InventoryReservationStatus,
} from "./entities/inventory-reservation.entity";
import { Product } from "./entities/product.entity";

interface ReservationItem {
  productId: string;
  quantity: number;
}

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(InventoryReservation)
    private readonly reservationRepository: Repository<InventoryReservation>,
  ) {}

  async reserveInventory(
    manager: EntityManager,
    orderId: string,
    items: ReservationItem[],
  ) {
    const productIds = items.map((item) => item.productId);
    const products = await manager
      .getRepository(Product)
      .createQueryBuilder("product")
      .where("product.id IN (:...ids)", { ids: productIds })
      .setLock("pessimistic_write")
      .getMany();

    const missing = productIds.filter(
      (id) => !products.some((product) => product.id === id),
    );
    if (missing.length > 0) {
      throw new BadRequestException(
        `Products not found: ${missing.join(", ")}`,
      );
    }

    for (const item of items) {
      const product = products.find((entry) => entry.id === item.productId);
      if (!product || product.availableStock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product ${item.productId}`,
        );
      }
      product.availableStock -= item.quantity;
    }

    await manager.save(products);

    const reservations = items.map((item) =>
      this.reservationRepository.create({
        order: { id: orderId } as any,
        productId: item.productId,
        quantity: item.quantity,
        status: InventoryReservationStatus.RESERVED,
      }),
    );

    await manager.save(reservations);
  }

  async releaseInventory(orderId: string) {
    const reservations = await this.reservationRepository.find({
      where: {
        order: { id: orderId },
        status: InventoryReservationStatus.RESERVED,
      },
    });

    if (reservations.length === 0) {
      return;
    }

    const productIds = reservations.map((entry) => entry.productId);
    const products = await this.productRepository.findBy({
      id: In(productIds),
    });

    for (const reservation of reservations) {
      const product = products.find(
        (item) => item.id === reservation.productId,
      );
      if (product) {
        product.availableStock += reservation.quantity;
      }
      reservation.status = InventoryReservationStatus.RELEASED;
    }

    await this.productRepository.save(products);
    await this.reservationRepository.save(reservations);
  }
}
