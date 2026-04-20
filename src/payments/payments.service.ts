import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Order } from "../orders/entities/order.entity";
import {
  PaymentStatus,
  PaymentTransaction,
} from "./entities/payment-transaction.entity";

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepository: Repository<PaymentTransaction>,
  ) {}

  async simulatePayment(
    order: Order,
  ): Promise<{ success: boolean; transaction: PaymentTransaction }> {
    const transaction = this.transactionRepository.create({
      order: order as any,
      status: PaymentStatus.PENDING,
      attempts: 0,
    });
    const savedTransaction = await this.transactionRepository.save(transaction);

    const success = Math.random() > 0.25;
    savedTransaction.attempts += 1;
    savedTransaction.status = success
      ? PaymentStatus.SUCCEEDED
      : PaymentStatus.FAILED;
    savedTransaction.failureReason = success
      ? null
      : "Simulated payment failure";
    await this.transactionRepository.save(savedTransaction);

    return { success, transaction: savedTransaction };
  }
}
