import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Product } from "./inventory/entities/product.entity";

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async onModuleInit() {
    const count = await this.productRepository.count();
    if (count === 0) {
      await this.productRepository.save([
        {
          sku: "SKU-001",
          name: "Standard Wireless Mouse",
          price: 29.99,
          totalStock: 100,
          availableStock: 100,
        },
        {
          sku: "SKU-002",
          name: "Mechanical Keyboard",
          price: 89.99,
          totalStock: 50,
          availableStock: 50,
        },
        {
          sku: "SKU-003",
          name: "USB-C Charger",
          price: 19.99,
          totalStock: 150,
          availableStock: 150,
        },
      ]);
    }
  }
}
