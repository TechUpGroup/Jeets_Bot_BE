import config from "common/config";
import { allNetworks } from "common/constants/network";
import { Network } from "common/enums/network.enum";
import { SignerType } from "common/enums/signer.enum";

import { BadRequestException, Injectable } from "@nestjs/common";
import { AnchorProvider, BN, Wallet, web3 } from "@project-serum/anchor";
import * as anchor from "@coral-xyz/anchor";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { EVENT, EVENT_VOTING } from "common/constants/event";
import { common, votingIDL } from "common/idl/pool";
import { Cron, CronExpression } from "@nestjs/schedule";
import { LogsService } from "modules/logs/logs.service";
import { TOTAL_AMOUNT } from "common/constants/asset";
import { ScJeetsSol, Voting } from "common/idl/jeets";

interface SolanaProvider {
  connection: web3.Connection;
  connectionConfirmed: web3.Connection;
  connectionVoting: web3.Connection;
  connectionConfirmedVoting: web3.Connection;
  signers: Map<SignerType, web3.Keypair>;
  provider: AnchorProvider;
  providerEvent: AnchorProvider;
  providerVoting: AnchorProvider;
}

export interface SolanaEvents {
  event: any;
  transactionHash: string;
  logIndex: number;
  blockTime: number;
  remain?: number;
  transfer_amount?: string;
  account?: string;
  uid?: number;
  sessionId?: number;
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

const modifyComputeUnits = web3.ComputeBudgetProgram.setComputeUnitLimit({
  units: 300_000,
});

const addPriorityFee = web3.ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: 600_000,
});

@Injectable()
export class SolanasService {
  private readonly solanaMap: Map<Network, SolanaProvider>;
  private readonly programMap: Map<string, anchor.Program<ScJeetsSol>>;

  constructor(private readonly logsService: LogsService) {
    this.solanaMap = new Map<Network, SolanaProvider>();
    this.programMap = new Map<string, anchor.Program<ScJeetsSol>>();
    for (const network of allNetworks) {
      const connection: web3.Connection = new web3.Connection(config.listRPC[0], "recent");
      const connectionConfirmed: web3.Connection = new web3.Connection(config.listRPC[1], "confirmed");
      const connectionVoting: web3.Connection = new web3.Connection(
        config.listRPC[2],
        "recent",
      );

      const connectionConfirmedVoting: web3.Connection = new web3.Connection(
        config.listRPC[2],
        "confirmed",
      );

      const signerTypes = new Map<SignerType, web3.Keypair>();
      const { operator, authority } = config.getBlockchainPrivateKey(network);
      if (operator) signerTypes.set(SignerType.operator, this.loadKeyPair(operator));
      if (authority) signerTypes.set(SignerType.authority, this.loadKeyPair(authority));

      const wallet = new Wallet(this.loadKeyPair(operator));
      const walletAuthority = new Wallet(this.loadKeyPair(authority));
      const provider = new AnchorProvider(connection, wallet, {
        commitment: "processed",
      });
      const providerEvent = new AnchorProvider(connection, wallet, {
        commitment: "confirmed",
      });
      const providerVoting = new AnchorProvider(connectionVoting, walletAuthority, {
        commitment: "confirmed",
      });
      this.solanaMap.set(network, {
        connection,
        connectionConfirmed,
        connectionVoting,
        connectionConfirmedVoting,
        signers: signerTypes,
        provider,
        providerEvent,
        providerVoting,
      });
      for (const address of config.getContract().pools) {
        common.address = address;
        const anchorProgram = new anchor.Program(
          common as ScJeetsSol,
          this.getProvider(Network.solana) as anchor.AnchorProvider,
        );
        this.programMap.set(address, anchorProgram);
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async syncTransferToken() {
    const network = Network.solana;
    for (const address of config.getContract().pools) {
      try {
        const mint = new web3.PublicKey("FZEWxnkkVM4Eqvrt8Shipj6MJsnGptZNgM7bZwPmpump");
        const operator = this.getSigner(network, SignerType.operator);
        const program = this.getProgram(address);
        await program.methods
          .operatorTransfer(new BN(TOTAL_AMOUNT))
          .accounts({
            mint: mint,
          })
          .signers([operator])
          .rpc();
      } catch (e) {
        console.log(e);
        this.logsService.createLog("syncTransferToken", e);
      }
      await new Promise((r) => setTimeout(r, 10 * 1000));
    }
  }

  getProgram(address: string) {
    const program = this.programMap.get(address);
    if (!program) throw new Error(`${address} is not set`);
    return program;
  }

  async getTokenAccountOwner(tokenAccount: web3.PublicKey): Promise<string> {
    const owner = (await this.getConnection(Network.solana).getParsedAccountInfo(new web3.PublicKey(tokenAccount)))
      .value?.data["parsed"].info.owner;
    return owner;
  }

  async getTokenAccountBalance(network: Network): Promise<string> {
    const associateUser = new web3.PublicKey("6vJqmEH6eNfHzEPu7parjtwqBpKwiWPB9RruURsHxWCH");
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

  getConnectionVoting(network: Network) {
    return this.getNetwork(network).connectionVoting;
  }

  getConnectionConfirmedVoting(network: Network) {
    return this.getNetwork(network).connectionConfirmedVoting;
  }

  getProvider(network: Network) {
    return this.getNetwork(network).provider;
  }

  getProviderEvent(network: Network) {
    return this.getNetwork(network).providerEvent;
  }

  getProviderVoting(network: Network) {
    return this.getNetwork(network).providerVoting;
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

  eventParserVoting(network: Network, idl: any) {
    const program = new anchor.Program(idl as Voting, this.getProviderVoting(network) as anchor.AnchorProvider);
    return new anchor.EventParser(program.programId, program.coder);
  }

  async votingInstruction(userAddress: string, vid: number, wid: number) {
    const network = Network.solana;
    const program = new anchor.Program(votingIDL as Voting, this.getProviderVoting(network) as anchor.AnchorProvider);
    const operator = this.getSigner(network, SignerType.authority);
    const userPubkey = new web3.PublicKey(userAddress);
    try {
      const transaction = new web3.Transaction();
      const voteInstruction = await program.methods
        .vote(new BN(vid), new BN(wid))
        .accounts({
          user: userPubkey,
        })
        .accountsPartial({
          operator: operator.publicKey,
        })
        .instruction();
      transaction.add(voteInstruction);
      transaction.recentBlockhash = (await this.getConnectionVoting(network).getLatestBlockhash()).blockhash;
      transaction.feePayer = userPubkey;
      transaction.add(modifyComputeUnits).add(addPriorityFee);
      transaction.partialSign(operator);
      return transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
    } catch (e) {
      throw new BadRequestException(e);
    }
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
        limit: 10,
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

  async getAllEventVotingTransactions(
    network: Network,
    eventParser: anchor.EventParser,
    mintAddress: web3.PublicKey,
    until?: string,
    limit?: number,
  ): Promise<TransferResponse> {
    const allEvents: SolanaEvents[] = [];
    const txs = await this.getConnectionConfirmedVoting(network).getSignaturesForAddress(
      mintAddress,
      {
        until,
        limit,
      },
      "confirmed",
    );
    if (!txs.length) return { signatureLatest: undefined, solanaEvents: [] };
    const txSuccess = txs.filter((tx) => tx.err === null).map((tx) => tx.signature);
    const transactions = await this.getConnectionConfirmedVoting(network).getParsedTransactions(txSuccess.reverse(), {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    for (const tx of transactions) {
      if (tx && tx?.meta && tx?.meta?.logMessages) {
        try {
          const events = eventParser.parseLogs(tx?.meta?.logMessages);
          for (const event of events) {
            const { data, name } = event as any;
            if (Object.values(EVENT_VOTING).includes(name)) {
              allEvents.push({
                event: event.name,
                transactionHash: tx.transaction.signatures[0],
                logIndex: name === EVENT_VOTING.VOTED ? 0 : 1,
                blockTime: tx.blockTime || 0,
                account: data?.account ? data?.account.toString() : "",
                uid: data?.uid ? +data?.uid.toString() : 0,
                sessionId: data?.session ? +data?.session.toString() : 0,
              });
            }
          }
        } catch {}
      }
    }

    return { signatureLatest: txs[0].signature, solanaEvents: allEvents };
  }
}
