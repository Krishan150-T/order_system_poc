import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InventoryReservation } from "./entities/inventory-reservation.entity";
import { Product } from "./entities/product.entity";
import { InventoryService } from "./inventory.service";

@Module({
  imports: [TypeOrmModule.forFeature([Product, InventoryReservation])],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
