import { ConflictException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, QueryFailedError, Repository } from "typeorm";
import {
  IdempotencyKey,
  IdempotencyStatus,
} from "../entities/idempotency-key.entity";

@Injectable()
export class IdempotencyService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(IdempotencyKey)
    private readonly idempotencyRepository: Repository<IdempotencyKey>,
  ) {}

  async computeRequestHash(payload: unknown): Promise<string> {
    const normalized = this.normalizePayload(payload);
    const hash = require("crypto").createHash("sha256");
    hash.update(JSON.stringify(normalized));
    return hash.digest("hex");
  }

  private normalizePayload(payload: unknown): unknown {
    if (Array.isArray(payload)) {
      return payload.map((item) => this.normalizePayload(item));
    }
    if (payload && typeof payload === "object") {
      return Object.keys(payload)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = this.normalizePayload(
            (payload as Record<string, unknown>)[key],
          );
          return acc;
        }, {});
    }
    return payload;
  }

  async registerPendingKey(
    key: string,
    requestHash: string,
  ): Promise<IdempotencyKey> {
    try {
      const record = this.idempotencyRepository.create({
        key,
        requestHash,
        status: IdempotencyStatus.PENDING,
      });
      return await this.idempotencyRepository.save(record);
    } catch (error) {
      // Only handle unique constraint violations (PostgreSQL code 23505)
      if (
        error instanceof QueryFailedError &&
        error.driverError?.code === "23505"
      ) {
        const existing = await this.idempotencyRepository.findOne({
          where: { key },
        });
        if (!existing) {
          throw error; // Re-throw if we can't find the existing record
        }
        if (existing.requestHash !== requestHash) {
          throw new ConflictException(
            "Idempotency key already used with different payload",
          );
        }
        return existing;
      }
      // Re-throw any other errors
      throw error;
    }
  }

  async getExistingResponse(key: string): Promise<IdempotencyKey | null> {
    return this.idempotencyRepository.findOne({ where: { key } });
  }

  async deleteKey(key: string): Promise<void> {
    await this.idempotencyRepository.delete(key);
  }

  async completeKey(
    key: string,
    responseData: unknown,
    queryRunner?: any,
  ): Promise<void> {
    const updateData = {
      status: IdempotencyStatus.COMPLETED,
      responseData: JSON.stringify(responseData),
    };

    if (queryRunner) {
      await queryRunner.manager.update(IdempotencyKey, key, updateData);
    } else {
      await this.idempotencyRepository.update(key, updateData);
    }
  }
}
