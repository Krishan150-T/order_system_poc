import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Order } from "../../orders/entities/order.entity";

export enum InventoryReservationStatus {
  RESERVED = "RESERVED",
  RELEASED = "RELEASED",
}

@Entity({ name: "inventory_reservations" })
export class InventoryReservation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Order, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order!: Order;

  @Column({ type: "varchar", length: 64 })
  productId!: string;

  @Column({ type: "integer" })
  quantity!: number;

  @Column({ type: "varchar", length: 16 })
  status!: InventoryReservationStatus;
}
