export enum EVENT {
  OPERATOR_TRANSFER = "operatorTransfer",
}

export enum EVENT_VOTING {
  VOTED = "voted",
}

export enum EVENT_AIRDROP {
  CLAIM = "claimed",
}

export enum EVENT_TOKEN {
  SWAP = "Swap",
  TRANSFER = "transferChecked",
}

export enum EVENT_CAMPAGIN_HISTORIES {
  HOLD = "Hold",
  SENT = "Sent",
  RECEIVED = "Received",
  BUY = "Bought",
  SELL = "Sold",
  VOTED = "Voted",
}

export enum EVENT_SCORE {
  VOTING = "Voting",
  CAMPAIGN_HOLD_TOKEN = "CampaignHoldToken",
  TRANSFER_TOKEN = "TransferToken",
}

export const messageErr = "query returned more than 10000 results";
