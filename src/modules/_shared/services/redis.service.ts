import { Injectable } from "@nestjs/common";
import { createClient, RedisClientType } from "redis";
import config from "common/config";

@Injectable()
export class RedisService {
  private redisClient: RedisClientType<any, any, any> = config.redisConfig.enable ? this.newRedisClient() : undefined;

  constructor() {
    if (config.redisConfig.enable) {
      // eslint-disable-next-line @typescript-eslint/no-extra-semi
      (async () => {
        this.redisClient = this.newRedisClient();
        await this.redisClient.connect().catch(console.error);
        if (config.redisConfig.flushOnStartup) {
          await this.redisClient.FLUSHDB().catch(console.error);
        }
      })();
    }
  }

  public newRedisClient(): any {
    const client = createClient({
      url: config.redisConfig.url,
      socket: {
        timeout: config.redisConfig.timeout || 3000,
        reconnectStrategy: (retries: number): number | Error => {
          if (retries > +(process.env.REDIS_STRATEGY || 3)) {
            console.log("Too many retries on REDIS. Connection terminated");
            return new Error("Too many retries.");
          } else {
            return retries;
          }
        },
      },
    });
    client.on("error", (err) => console.log(err));
    client.on("connect", () => console.log("Connected successfully to server"));
    return client;
  }

  on(eventName: string | symbol, listener: (...args: any[]) => void): any {
    return this.redisClient.on(eventName, listener);
  }

  subscribe(channels: string | string[], listener: any): Promise<any> {
    return this.redisClient.subscribe(channels, listener);
  }

  keys(...args: any): Promise<any> {
    return this.redisClient.keys(...args);
  }

  async set(store: string, payload: string): Promise<any> {
    return await this.redisClient.SET(store, payload);
  }

  async setex(store: string, expireSecond: number, payload: string): Promise<any> {
    return await this.redisClient.SETEX(store, expireSecond, payload);
  }

  async expire(key: string, seconds: number): Promise<any> {
    return await this.redisClient.expire(key, seconds);
  }

  async expireAt(key: string, seconds: number | Date): Promise<any> {
    return await this.redisClient.expireAt(key, seconds);
  }

  async exists(store: any): Promise<any> {
    return !!(await this.redisClient.EXISTS(store));
  }

  async remove(store: any): Promise<any> {
    if (typeof store === "string") store = [store];
    return await this.redisClient.del(store);
  }

  async removeWildcard(store: any): Promise<any> {
    const rows = await this.redisClient.keys(store);
    if (!rows) return;
    return await this.redisClient.del(rows);
  }

  async get(key: string): Promise<any> {
    return await this.redisClient.get(key);
  }

  async mGet(keys: string[]): Promise<any> {
    return await this.redisClient.mGet(keys);
  }

  async clearKeys(key: string): Promise<any> {
    const keys = await this.getAll(key, true);
    if (keys.length) await this.remove(keys);
    return true;
  }

  async getAll(store: string, getKeysOnly?: boolean): Promise<any> {
    const getSingleValue = async (key) => {
      const value = await this.redisClient.get(key);
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch (err) {
        return value;
      }
    };

    const values = await this.redisClient.keys(store);
    if (getKeysOnly) return values;
    const results: any[] = [];
    for (const value of values) results.push(await getSingleValue(value));
    return results.filter(Boolean);
  }

  async addSet(store: string, key: string): Promise<any> {
    return await this.redisClient.SADD(store, key);
  }

  async checkSet(store: string, key: string): Promise<any> {
    return await this.redisClient.SISMEMBER(store, key);
  }

  async incr(key: string, expireSecond?: number) {
    const result = await this.redisClient.INCR(key);
    if (expireSecond) {
      this.expire(key, expireSecond);
    }
    return result;
  }

  async decr(key: string) {
    return await this.redisClient.DECR(key);
  }

  async getFunc(key: string, func: () => any, ttl = 60 * 60) {
    const dataCached = await this.get(key);
    if (dataCached !== null) {
      try {
        return JSON.parse(dataCached);
      } catch (err) {
        /* empty */
      }
    }
    const data = await func();
    await this.setex(key, ttl, JSON.stringify(data));
    return data;
  }
}
