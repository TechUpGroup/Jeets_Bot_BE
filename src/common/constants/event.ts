export enum EVENT {
  OPERATOR_TRANSFER = "operatorTransfer",
}

export enum EVENT_VOTING {
  VOTED = "voted",
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
}

export const messageErr = "query returned more than 10000 results";
