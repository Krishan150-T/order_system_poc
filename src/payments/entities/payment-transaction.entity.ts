import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Order } from "../../orders/entities/order.entity";

export enum PaymentStatus {
  PENDING = "PENDING",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
}

@Entity({ name: "payment_transactions" })
export class PaymentTransaction {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Order, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order!: Order;

  @Column({ type: "varchar", length: 24, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @Column({ type: "integer", default: 0 })
  attempts!: number;

  @Column({ type: "text", nullable: true })
  failureReason!: string | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt!: Date;
}
