import config from "common/config";
import { allNetworks } from "common/constants/network";
import { Network } from "common/enums/network.enum";
import { SignerType } from "common/enums/signer.enum";

import { Injectable } from "@nestjs/common";
import { AnchorProvider, BN, EventParser, Wallet, web3 } from "@project-serum/anchor";
import * as anchor from "@coral-xyz/anchor";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { EVENT } from "common/constants/event";
import idl from "common/idl/pool.json";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ScJeetsSol } from "common/idl/jeets";
import { LogsService } from "modules/logs/logs.service";
import { TOTAL_AMOUNT } from "common/constants/asset";

interface SolanaProvider {
  connection: web3.Connection;
  connectionConfirmed: web3.Connection;
  signers: Map<SignerType, web3.Keypair>;
  provider: AnchorProvider;
  providerEvent: AnchorProvider;
}

export interface SolanaEvents {
  event: any;
  transactionHash: string;
  logIndex: number;
  blockTime: number;
  remain: number;
  transfer_amount: string;
}

export interface SolanaTransferEvents {
  event: any;
  transactionHash: string;
  logIndex: number;
  blockTime: number;
  amount: string;
  from: string;
  to: string;
}

interface TransferResponse {
  solanaEvents: SolanaEvents[] | SolanaTransferEvents[];
  signatureLatest?: string;
}

@Injectable()
export class SolanasService {
  private rpcChoosen = 0;
  private readonly solanaMap: Map<Network, SolanaProvider>;

  constructor(
    private readonly logsService: LogsService
  ) {
    this.solanaMap = new Map<Network, SolanaProvider>();
    for (const network of allNetworks) {
      const connection: web3.Connection = new web3.Connection(config.getBlockchainProvider(network), "recent");
      const connectionConfirmed: web3.Connection = new web3.Connection(
        config.getBlockchainProvider(network),
        "confirmed",
      );

      const signerTypes = new Map<SignerType, web3.Keypair>();
      const { operator } = config.getBlockchainPrivateKey(network);
      if (operator) signerTypes.set(SignerType.operator, this.loadKeyPair(operator));

      const wallet = new Wallet(this.loadKeyPair(operator));
      const provider = new AnchorProvider(connection, wallet, {
        commitment: "processed",
      });
      const providerEvent = new AnchorProvider(connection, wallet, {
        commitment: "confirmed",
      });
      this.solanaMap.set(network, { connection, connectionConfirmed, signers: signerTypes, provider, providerEvent });
    }
  }

  switchRPC() {
    for (const network of allNetworks) {
      this.rpcChoosen = (this.rpcChoosen + 1) % 4;
      const connection: web3.Connection = new web3.Connection(config.listRPC[this.rpcChoosen], "recent");
      const connectionConfirmed: web3.Connection = new web3.Connection(config.listRPC[this.rpcChoosen], "confirmed");

      const signerTypes = new Map<SignerType, web3.Keypair>();
      const { operator } = config.getBlockchainPrivateKey(network);
      if (operator) signerTypes.set(SignerType.operator, this.loadKeyPair(operator));

      const wallet = new Wallet(this.loadKeyPair(operator));
      const provider = new AnchorProvider(connection, wallet, {
        commitment: "processed",
      });
      const providerEvent = new AnchorProvider(connection, wallet, {
        commitment: "confirmed",
      });
      this.solanaMap.set(network, {
        connection,
        connectionConfirmed,
        signers: signerTypes,
        provider,
        providerEvent,
      });
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncTransferToken() {
    try {
      const mint = new web3.PublicKey("DHubdLtghHMXsU2e4s5LLERXyvTY71B53tQ8tQkBYL9o");
      const operator = this.getSigner(Network.solana, SignerType.operator);
      const program = new anchor.Program(idl as ScJeetsSol, this.getProvider(Network.solana) as anchor.AnchorProvider);
  
      await program.methods
        .operatorTransfer(new BN(TOTAL_AMOUNT))
        .accounts({
          mint: mint,
          receiver: operator.publicKey,
        })
        .signers([operator])
        .rpc();
    } catch(e) {
      this.logsService.createLog("syncTransferToken", e)
    }

  }

  async getTokenAccountOwner(tokenAccount: web3.PublicKey): Promise<string> {
    const owner = (await this.getConnection(Network.solana).getParsedAccountInfo(new web3.PublicKey(tokenAccount)))
      .value?.data["parsed"].info.owner;
    return owner;
  }

  async getTokenAccountBalance(network: Network): Promise<string> {
    const associateUser = new web3.PublicKey("E5po1oc2r2XHRaK4VCgVAkc6fEdFBL6rJwquHZVEigFW");
    const amount = await this.getConnectionConfirmed(network).getTokenAccountBalance(associateUser);
    return amount.value.amount;
  }

  loadKeyPair(privateKey: string): web3.Keypair {
    const privateKeyBase = bs58.decode(privateKey);
    return web3.Keypair.fromSecretKey(new Uint8Array(privateKeyBase));
  }

  getNetwork(network: Network) {
    const networkInfo = this.solanaMap.get(network);
    if (!networkInfo) throw new Error(`${network} is not set`);
    return networkInfo;
  }

  getConnection(network: Network) {
    return this.getNetwork(network).connection;
  }

  getConnectionConfirmed(network: Network) {
    return this.getNetwork(network).connectionConfirmed;
  }

  getProvider(network: Network) {
    return this.getNetwork(network).provider;
  }

  getProviderEvent(network: Network) {
    return this.getNetwork(network).providerEvent;
  }

  getSigner(network: Network, type: SignerType) {
    const signers = this.getNetwork(network).signers;
    const signer = signers.get(type);
    if (!signer) {
      throw new Error(`signer ${network} ${type} is not set`);
    }
    return signer;
  }

  getLastBlockNumber(network: Network) {
    return this.getConnection(network).getSlot();
  }

  getBalance(address: string, network: Network) {
    return this.getConnection(network).getBalance(new web3.PublicKey(address));
  }

  async getGasPrice(network: Network, transaction: any) {
    const feeRate = await this.getConnection(network).getMinimumBalanceForRentExemption(transaction.serialize().length);

    const fee = feeRate * transaction.serialize().length;

    return fee;
  }

  async getBlockTime(network: Network, blockNumber: number) {
    try {
      return this.getConnection(network).getBlockTime(blockNumber);
    } catch (e) {
      console.log("ERROR_BLOCK_TIME ` : ", e);
      return 0;
    }
  }

  newKeyPair() {
    return web3.Keypair.generate();
  }

  eventParser(network: Network, idl: any) {
    const program = new anchor.Program(idl as ScJeetsSol, this.getProviderEvent(network) as anchor.AnchorProvider);
    return new anchor.EventParser(program.programId, program.coder);
  }

  async getAllEventTransactions(
    network: Network,
    eventParser: anchor.EventParser,
    mintAddress: web3.PublicKey,
    until?: string,
    limit?: number,
  ): Promise<TransferResponse> {
    const allEvents: SolanaEvents[] = [];
    const txs = await this.getConnectionConfirmed(network).getSignaturesForAddress(
      mintAddress,
      {
        until,
        limit,
      },
      "confirmed",
    );
    if (!txs.length) return { signatureLatest: undefined, solanaEvents: [] };
    const txSuccess = txs.filter((tx) => tx.err === null).map((tx) => tx.signature);
    const transactions = await this.getConnectionConfirmed(network).getParsedTransactions(txSuccess.reverse(), {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    for (const tx of transactions) {
      if (tx && tx?.meta && tx?.meta?.logMessages) {
        try {
          const events = eventParser.parseLogs(tx?.meta?.logMessages);
          for (const event of events) {
            const { data, name } = event as any;
            if (Object.values(EVENT).includes(name)) {
              allEvents.push({
                event: event.name,
                transactionHash: tx.transaction.signatures[0],
                logIndex: name === EVENT.OPERATOR_TRANSFER ? 0 : 1,
                blockTime: tx.blockTime || 0,
                remain: data?.remain ? data?.remain.toString() : "0",
                transfer_amount: data?.transferAmount ? data?.transferAmount.toString() : "0",
              });
            }
          }
        } catch {}
      }
    }

    return { signatureLatest: txs[0].signature, solanaEvents: allEvents };
  }
}
