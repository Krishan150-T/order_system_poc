import { Body, Controller, Get, Header, Param, Post } from "@nestjs/common";
import { CreateOrderDto } from "./dto/create-order.dto";
import { OrdersService } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Header("Content-Type", "application/json")
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createOrder(
      createOrderDto,
      createOrderDto.idempotencyKey,
    );
  }

  @Get(":id")
  async getOrder(@Param("id") id: string) {
    return this.ordersService.findOrder(id);
  }

  @Post(":id/ship")
  async shipOrder(@Param("id") id: string) {
    return this.ordersService.shipOrder(id);
  }

  @Post(":id/deliver")
  async deliverOrder(@Param("id") id: string) {
    return this.ordersService.deliverOrder(id);
  }
}
