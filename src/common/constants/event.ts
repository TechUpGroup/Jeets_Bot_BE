export enum EVENT {
  TRANSFER = "Transfer",
}

export enum EVENT_MOONAD {
  MINTED = "TokenCreated",
  TRADED = "TokenTrading",
  TRANSFER = "TokenTransfer",
  BUY = "TokenBuy",
  SELL = "TokenSell",
  REFERRAL = "ReferralRewardDistributed",
  PAIR = "PairCreated",
}

export enum EVENT_AIRDROP {
  AIRDROP = "Airdrop",
}

export const messageErr = "query returned more than 10000 results";
