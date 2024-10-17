import { Options } from "common/config/mongoose.config";
import { Document, SchemaTypes, Types } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Network } from "common/enums/network.enum";
import { isNil } from "lodash";
import { EVENT } from "common/constants/event";

export const HISTORIES_MODEL = "histories";

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
