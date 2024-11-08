import { PaginateModel } from "mongoose";
import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import config from "common/config";
import { USER_WITHDRAWS_MODEL, UserWithdrawDocument } from "./schemas/users-withdraw.schema";
import { UsersDocument } from "modules/users/schemas/users.schema";
import { UsersService } from "modules/users/users.service";
import { Network } from "common/enums/network.enum";
import { ContractName } from "common/constants/contract";
import { SignerType } from "common/enums/signer.enum";
import { generateRandomString, keccak256 } from "common/utils/ethers";
import { TOTAL_AMOUNT_PER_DEPOSIT, TOTAL_TOKEN_PER_AMOUNT } from "common/constants/asset";
import BigNumber from "bignumber.js";
import { SolanasService } from "modules/_shared/services/solana.service";

@Injectable()
export class WithdrawsService {
  constructor(
    @InjectModel(USER_WITHDRAWS_MODEL)
    private readonly userWithdrawModel: PaginateModel<UserWithdrawDocument>,
    private readonly usersService: UsersService,
    private readonly solanasService: SolanasService,
  ) {}

  async bulkWithdraw(bulkUpdate: any[]) {
    return this.userWithdrawModel.bulkWrite(bulkUpdate);
  }

  async checkRetryTx(user: UsersDocument) {
    const res = await this.userWithdrawModel.find({ address: user.address, success: false }).limit(1);
    if (res.length) {
      return true;
    }
    return false;
  }

  async withdrawToken(user: UsersDocument) {
    const res = await this.userWithdrawModel.find({ address: user.address, success: false }).limit(1);
    if (res.length) {
      return res[0].signature;
    }
    if (!user?.twitter_uid) {
      throw new BadRequestException("User not connected X");
    }
    if (BigNumber(user.sol_deposited.toString()).lte(0)) {
      throw new BadRequestException("Not deposited");
    }
    const now = new Date().getTime();
    const nonce = keccak256(user.address.slice(2) + generateRandomString(6) + now.toString());
    const amount = BigNumber(user.sol_deposited.toString()).dividedBy(TOTAL_AMOUNT_PER_DEPOSIT).multipliedBy(TOTAL_TOKEN_PER_AMOUNT).toFixed(0);

    const signature = await this.solanasService.chadClaimTokenInstruction(user.address, "",nonce, amount);
    const item: any = {
      timestamp: Math.floor(Date.now() / 1000),
      address: user.address,
      amount,
      nonce,
      signature: signature.toString("base64"),
    };
    await Promise.all([this.userWithdrawModel.create(item), this.usersService.updateBalance(user, { is_claimed: true, $inc: { balance: BigNumber(user.sol_deposited.toString()).multipliedBy(-1).toFixed(0) } })]);
    return signature.toString("base64");
  }
}
