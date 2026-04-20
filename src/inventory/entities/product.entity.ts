import { Column, Entity, PrimaryGeneratedColumn, VersionColumn } from "typeorm";

@Entity({ name: "products" })
export class Product {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 64, unique: true })
  sku!: string;

  @Column({ type: "varchar", length: 128 })
  name!: string;

  @Column({ type: "numeric", precision: 12, scale: 2 })
  price!: number;

  @Column({ type: "integer" })
  totalStock!: number;

  @Column({ type: "integer" })
  availableStock!: number;

  @VersionColumn()
  version!: number;
}
