import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaymentsService } from "./payments.service";
import { PaymentTransaction } from "./entities/payment-transaction.entity";

@Module({
  imports: [TypeOrmModule.forFeature([PaymentTransaction])],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
