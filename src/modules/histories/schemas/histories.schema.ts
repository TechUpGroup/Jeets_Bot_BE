import { Options } from "common/config/mongoose.config";
import { Document, SchemaTypes, Types } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Network } from "common/enums/network.enum";
import { isNil } from "lodash";
import { EVENT, EVENT_AIRDROP, EVENT_TOKEN, EVENT_VOTING } from "common/constants/event";

export const HISTORIES_MODEL = "histories";
export const VOTING_HISTORIES_MODEL = "voting-histories";
export const TOKEN_HISTORIES_MODEL = "token-histories";
export const AIRDROP_HISTORIES_MODEL = "airdrop-histories";

@Schema(Options)
export class Histories {
  @Prop({ required: true, index: true, enum: EVENT })
  event: EVENT;

  @Prop({ required: true, index: true, enum: Network })
  network: Network;

  @Prop({ required: true, index: true })
  contract_address: string;

  @Prop({ required: true, index: true })
  transaction_hash: string;

  @Prop({ required: true, index: true })
  log_index: number;

  @Prop({
    required: false,
    unique: true,
    sparse: true,
    default: function () {
      const { transaction_hash, log_index, network } = this;
      if (transaction_hash && !isNil(log_index) && network) {
        return `${transaction_hash}_${log_index}_${network}`;
      }
    },
  })
  transaction_hash_index?: string;

  @Prop({ required: true, index: true })
  timestamp: number;

  @Prop({ required: true, type: SchemaTypes.Decimal128, default: 0, min: 0  })
  remain: Types.Decimal128;

  @Prop({ required: true, type: SchemaTypes.Decimal128, default: 0, min: 0  })
  transfer_amount: Types.Decimal128;
}
export type HistoriesDocument = Histories & Document;
export const HistoriesSchema = SchemaFactory.createForClass(Histories);

@Schema(Options)
export class VotingHistories {
  @Prop({ required: true, index: true, enum: EVENT_VOTING })
  event: EVENT_VOTING;

  @Prop({ required: true, index: true, enum: Network })
  network: Network;

  @Prop({ required: true, index: true })
  transaction_hash: string;

  @Prop({ required: true, index: true })
  log_index: number;

  @Prop({
    required: false,
    unique: true,
    sparse: true,
    default: function () {
      const { transaction_hash, log_index, network } = this;
      if (transaction_hash && !isNil(log_index) && network) {
        return `${transaction_hash}_${log_index}_${network}`;
      }
    },
  })
  transaction_hash_index?: string;

  @Prop({ required: true, index: true })
  timestamp: number;
}
export type VotingHistoriesDocument = VotingHistories & Document;
export const VotingHistoriesSchema = SchemaFactory.createForClass(VotingHistories);

@Schema(Options)
export class AirdropHistories {
  @Prop({ required: true, index: true, enum: EVENT_AIRDROP })
  event: EVENT_AIRDROP;

  @Prop({ required: true, index: true, enum: Network })
  network: Network;

  @Prop({ required: true, index: true })
  contract_address: string;

  @Prop({ required: true, index: true })
  transaction_hash: string;

  @Prop({ required: true, index: true })
  log_index: number;

  @Prop({
    required: false,
    unique: true,
    sparse: true,
    default: function () {
      const { transaction_hash, log_index, network } = this;
      if (transaction_hash && !isNil(log_index) && network) {
        return `${transaction_hash}_${log_index}_${network}`;
      }
    },
  })
  transaction_hash_index?: string;

  @Prop({ required: true, index: true })
  timestamp: number;
}
export type AirdropHistoriesDocument = AirdropHistories & Document;
export const AirdropHistoriesSchema = SchemaFactory.createForClass(AirdropHistories);

@Schema(Options)
export class TokenHistories {
  @Prop({ required: true, index: true, enum: EVENT_TOKEN })
  event: EVENT_TOKEN;

  @Prop({ required: true, index: true, enum: Network })
  network: Network;

  @Prop({ required: true, index: true })
  contract_address: string;

  @Prop({ required: true, index: true })
  transaction_hash: string;

  @Prop({ required: true, index: true })
  log_index: number;

  @Prop({
    required: false,
    unique: true,
    sparse: true,
    default: function () {
      const { transaction_hash, log_index, network } = this;
      if (transaction_hash && !isNil(log_index) && network) {
        return `${transaction_hash}_${log_index}_${network}`;
      }
    },
  })
  transaction_hash_index?: string;

  @Prop({ required: true, index: true })
  timestamp: number;

  @Prop({ required: false })
  from: string;

  @Prop({ required: false })
  to: string;
}
export type TokenHistoriesDocument = TokenHistories & Document;
export const TokenHistoriesSchema = SchemaFactory.createForClass(TokenHistories);
