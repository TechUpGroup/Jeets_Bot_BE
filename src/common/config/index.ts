import redisStore from "cache-manager-redis-store";
import { Network } from "common/enums/network.enum";
import aggregatePaginate from "common/libs/mongoose-aggregate-paginate-v2";
import config from "config";
import { isNil } from "lodash";
import { Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

import { CacheModuleOptions } from "@nestjs/cache-manager";
import { MongooseModuleOptions } from "@nestjs/mongoose";
import { ContractName } from "common/constants/contract";

class Config {
  get nodeEnv(): string {
    return this.getString("node_env");
  }

  get cron() {
    const isDisableCron = Boolean(JSON.parse(process.env.DISABLE_CRON || "false"));
    return this.getBoolean("cron") && !isDisableCron;
  }

  get server() {
    return {
      host: this.getString("server.host"),
      port: this.getNumber("server.port"),
      url: this.getString("server.url"),
      tracking_url: this.getString("server.tracking_url"),
    };
  }

  get isDevelopment() {
    return this.nodeEnv === "development";
  }

  get mongoose(): { uri: string; options: MongooseModuleOptions } {
    // Use this to allow empty strings to pass the `required` validator
    Schema.Types.String.checkRequired((v) => typeof v === "string");
    return {
      uri: this.getString("mongodb.uri"),
      options: {
        directConnection: false,
        connectionFactory: (connection) => {
          connection.plugin(mongoosePaginate);
          connection.plugin(aggregatePaginate);
          return connection;
        },
      },
    };
  }

  get swagger() {
    return {
      name: this.getString("swagger.name"),
      description: this.getString("swagger.description"),
      doc_url: this.getString("swagger.doc_url"),
      version: this.getString("swagger.version"),
      is_auth: this.getBoolean("swagger.is_auth"),
      username: this.getString("swagger.username"),
      password: this.getString("swagger.password"),
    };
  }

  get redisConfig(): CacheModuleOptions {
    return {
      enable: this.getBoolean("redis.enable"),
      isGlobal: true,
      store: redisStore,
      url: this.getString("redis.uri"),
      prefix: `${this.getString("redis.prefix")}_${this.nodeEnv}_`,
      ttl: 10 * 69 * 1000,
    } as any;
  }

  get jwt() {
    return {
      secret: this.getString("jwt.secret"),
      accessExpirationMinutes: this.getNumber("jwt.access_expiration_minutes"),
      refreshExpirationDays: this.getNumber("jwt.refresh_expiration_days"),
    };
  }

  get aws() {
    return {
      access_key_id: this.getString("aws.access_key_id"),
      secret_access_key: this.getString("aws.secret_access_key"),
      s3_bucket: this.getString("aws.s3_bucket"),
      s3_path: this.getString("aws.s3_path"),
      region_name: this.getString("aws.region_name"),
      domain: this.getString("aws.domain"),
    };
  }

  get admin() {
    return this.getString("authAdmin");
  }

  get helius_url() {
    return this.getString("helius_url");
  }

  get fallbackLanguage(): string {
    return this.getString("i18n.fallback_language");
  }

  // ethereum config
  get syncEvent() {
    const numberBlockResync = 10;
    return {
      numberBlockResync,
      blockPerSync: 1000 - numberBlockResync,
    };
  }

  get listRPC() {
    return this.getArray("list_rpcs");
  }

  get listRPCBlock() {
    const rpcs = this.getArray("list_rpcs");
    return rpcs.slice(2);
  }

  get telegram() {
    return {
      api_key: this.getString("telegram.api_key"),
      bot_id: this.getString("telegram.bot_id"),
      origin_url: this.getString("telegram.origin_url"),
      callback_url: this.getString("telegram.callback_url"),
    };
  }

  get twitter() {
    return {
      clientId: this.getString("twitter.clientId"),
      clientSecret: this.getString("twitter.clientSecret"),
      callbackURL: this.getString("twitter.callbackURL"),
    };
  }

  get network_supported() {
    const networks = this.getArray<Network>("network_supported");
    const allNetworks = Object.values(Network);
    const networkSupport = networks.filter((network) => allNetworks.includes(network));
    if (networkSupport.length !== networks.length) {
      throw new Error(`network_supported environment variable: ${networks}  is not Network enum`);
    }
    return networkSupport;
  }

  getBlockchainPrivateKey(network: Network) {
    return {
      operator: this.getString(`blockchain.${network}.operator`),
      authority: this.getString(`blockchain.${network}.authority`),
    }
  }

  getAddressDev(network: Network) {
    return this.getString(`blockchain.${network}.dev`)
  }

  getAddressToken(network: Network) {
    return this.getString(`blockchain.${network}.token`)
  }

  getChainId(network: Network) {
    return this.getNumber(`blockchain.${network}.chain_id`);
  }

  getBlockchainProvider(network: Network) {
    return this.getBlockChainInfo(network, "provider");
  }

  getContract() {
    const pools = [
      "Ba5LSmzQjhi5bCz1GwUmNvhH59UdAgnGKeH7YoR8KXPg",
      "cE6fMRnkA8AcTXBTvWbHxXoBGoDENhmN9rd59mh5FEb",
      "4yc4CPtuUFHLTc6Mxx7X3deZRwVk9vVAXmsy61n49UH3",
      "6T9uhwscHxTvMADKqH17kxF43es3pD99b32W8Q3khJSb",
      "4DV4B42oAD6m7GLCTH1K7UKa8Jb9D6G2yjEm5V2F24nZ",
      "A1KrSRmoZ8SPUTSuMJyx8si5uiirDEQKpWk2ymQHCa4A",
      "4biuJy7eAUyDdPBvDc8ZBkmujVhVnyTv6Y5FbGwWWmdw",
      "DCrcUX4MZjhZqXn5SQx932y8Z1VkPLmL9RgPHyK3hZCi",
      "4RAVBWfSkoiNUwEMZkVu1mypd2Tc8gcXNT6XtVncMyPu",
      "5uyEauM9x5nJ5KLUm8BYUQHYnkZ7E4J13skw3DAobV3o"
    ];
    const votes = [
      "HeHN6998jMeBvpUoh5sc4c3JjRF5WwaqLKjXPJoFva8E"
    ]
    const tokens = [
      {
        mint: "FZEWxnkkVM4Eqvrt8Shipj6MJsnGptZNgM7bZwPmpump",
        totalSupply: "1000000000000000",
        symbol: "🌕",
        decimal: 6
      }
    ]
    const airdrops = [
      ""
    ]
    return {
      pools,
      votes,
      tokens,
      airdrops
    };
  }

  private getBlockChainInfo(network: Network, key: string) {
    return this.getString(`blockchain.${network}.${key}`);
  }

  private getString(key: string): string {
    const value = config.get<string>(key);
    if (isNil(value)) {
      throw new Error(key + " environment variable does not set");
    }

    return value.toString().replace(/\\n/g, "\n");
  }

  private getArray<T = string>(key: string): T[] {
    const value = config.get<T[]>(key);
    if (!Array.isArray(value)) {
      throw new Error(key + " environment variable is not array");
    }
    return value;
  }

  private getNumber(key: string): number {
    const value = this.getString(key);
    try {
      return Number(value);
    } catch {
      throw new Error(key + " environment variable is not a number");
    }
  }

  private getBoolean(key: string): boolean {
    const value = this.getString(key);
    try {
      return Boolean(JSON.parse(value));
    } catch {
      throw new Error(key + " env var is not a boolean");
    }
  }
}

export default new Config();
