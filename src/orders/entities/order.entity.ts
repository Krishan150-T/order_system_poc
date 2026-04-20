import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { OrderItem } from "./order-item.entity";
import { OrderStatus } from "../../common/enums/order-status.enum";

@Entity({ name: "orders" })
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 64 })
  customerId!: string;

  @Column({ type: "varchar", length: 64 })
  paymentMethod!: string;

  @Column({ type: "varchar", length: 24, default: OrderStatus.CREATED })
  status!: OrderStatus;

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
  totalAmount!: number;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  items!: OrderItem[];

  @Column({ type: "varchar", length: 128, nullable: true })
  idempotencyKey!: string | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt!: Date;
}
