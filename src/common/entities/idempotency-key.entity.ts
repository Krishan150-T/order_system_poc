import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

export enum IdempotencyStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
}

@Entity({ name: "idempotency_keys" })
export class IdempotencyKey {
  @PrimaryColumn({ type: "varchar", length: 128 })
  key!: string;

  @Column({ type: "varchar", length: 128 })
  requestHash!: string;

  @Column({ type: "text", nullable: true })
  responseData!: string | null;

  @Column({ type: "varchar", length: 16, default: IdempotencyStatus.PENDING })
  status!: IdempotencyStatus;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt!: Date;
}
