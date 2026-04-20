import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bull";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrdersModule } from "./orders/orders.module";
import { InventoryModule } from "./inventory/inventory.module";
import { PaymentsModule } from "./payments/payments.module";
import { QueueModule } from "./queue/queue.module";
import { CommonModule } from "./common/common.module";
import { Product } from "./inventory/entities/product.entity";
import { AppService } from "./app.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      database: process.env.DB_DATABASE || "order_system",
      entities: [__dirname + "/**/*.entity{.ts,.js}"],
      synchronize: true,
      logging: false,
    }),
    TypeOrmModule.forFeature([Product]),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),
    OrdersModule,
    InventoryModule,
    PaymentsModule,
    QueueModule,
    CommonModule,
  ],
  providers: [AppService],
})
export class AppModule {}
