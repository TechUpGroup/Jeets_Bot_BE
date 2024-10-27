import * as anchor from "@coral-xyz/anchor";
import { SolanaEvents } from "modules/_shared/services/solana.service";
import { ContractsDocument } from "modules/contracts/schemas/contracts.schema";

export interface IEventParams {
  events: SolanaEvents[];
  contract: ContractsDocument;
  eventHashes: string[];
}

export interface ContractParams {
  contract: ContractsDocument;
  acceptEvents: string[];
  acceptAddress?: string[];
  eventParser?: anchor.EventParser;
  callback: HandleFunc;
}

export interface HandleFunc {
  (input: IEventParams): Promise<void>;
}
