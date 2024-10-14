import { generateParamsSign } from "./ethers";

export function getMessageTrading(account: string, nonce: string, price: string, signTime: number) {
  const message =  generateParamsSign(
    ["bytes32", "address", "uint256", "uint256"],
    [nonce, account, price, signTime],
  );
  return {
    nonce,
    message
  }
}