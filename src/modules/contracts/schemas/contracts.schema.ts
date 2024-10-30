import { Options } from "common/config/mongoose.config";
import { Network } from "common/enums/network.enum";
import { Document } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ContractName } from "common/constants/contract";

export const CONTRACTS_MODEL = "contracts";

@Schema(Options)
export class Contracts {
  @Prop({ required: true, trim: true, index: true, unique: true })
  contract_address: string;

  @Prop({ required: false })
  tx_synced?: string;

  @Prop({ required: false })
  total_supply?: string;

  @Prop({ required: false })
  decimal?: number;

  @Prop({ required: false })
  symbol?: string;

  @Prop({ required: false })
  require_hold?: string;

  @Prop({ required: true, enum: ContractName })
  name: string;

  @Prop({ required: true, index: true, enum: Network })
  network: Network;
}

export type ContractsDocument = Contracts & Document;
export const ContractsSchema = SchemaFactory.createForClass(Contracts);
