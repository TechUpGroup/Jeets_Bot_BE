import { Options } from "common/config/mongoose.config";
import { Network } from "common/enums/network.enum";
import { Document } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ContractName } from "common/constants/contract";

export const CONTRACTS_MODEL = "contracts";

@Schema(Options)
export class Contracts {
  @Prop({ required: true, trim: true, index: true })
  contract_address: string;

  @Prop({ required: false })
  tx_synced?: string;

  @Prop({ required: true, enum: ContractName })
  name: string;

  @Prop({ required: true, index: true, enum: Network })
  network: Network;
}

export type ContractsDocument = Contracts & Document;
export const ContractsSchema = SchemaFactory.createForClass(Contracts);
ContractsSchema.index({ contract_address: 1, network: 1 }, { unique: true });