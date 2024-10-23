import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { CacheService } from "./cache.service";
import axios from "axios";
import { KEY_PRICE_TOKEN } from "modules/_jobs/sync-holder/solana/services/sync-holder.service";

export const KEY_PRICE_COINGECKO = "all_price_coingecko";

export enum Token {
  SOL = "solana",
}

@Injectable()
export class PricesService {
  constructor(private readonly cacheService: CacheService) {
    void this.start();
  }

  private isRunning = false;

  @Cron(CronExpression.EVERY_MINUTE)
  async start() {
    if (this.isRunning) return;
    try {
      this.isRunning = true;
      await this.getAllPrice(false);
    } catch {
    } finally {
      this.isRunning = false;
    }
  }

  async getAllPriceToken() {
    const cachedPrice = await this.cacheService.getKey(KEY_PRICE_TOKEN);
    if (cachedPrice) return JSON.parse(cachedPrice);
  }

  async getAllPrice(isCache = true) {
    if (isCache) {
      const cachedPrice = await this.cacheService.getKey(KEY_PRICE_COINGECKO);
      if (cachedPrice) return JSON.parse(cachedPrice);
    }
    const tokens = Object.values(Token);
    const prices = await this.getPrice(tokens.toString());

    if (!prices || !Object.keys(prices).length) return {};

    const res: { [key: string]: any } = {};
    for (const [key, name] of Object.entries(Token)) {
      res[key] = prices[name].usd;
    }
    await this.cacheService.setKey(KEY_PRICE_COINGECKO, JSON.stringify(res), 15 * 60 * 1000);
    console.log("=> Price: ", JSON.stringify(res));
    return res;
  }

  private async getPrice(ids: string) {
    try {
      const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
      if (res) {
        return res.data;
      }
      return
    } catch {
      return;
    }
  }
}
