import { PaginateModel, Types } from "mongoose";

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { HOLDERS_MODEL, HoldersDocument } from "./schemas/holders.schema";
import { Network } from "common/enums/network.enum";

@Injectable()
export class HoldersService {
  constructor(
    @InjectModel(HOLDERS_MODEL)
    private readonly holdersModel: PaginateModel<HoldersDocument>,
  ) {}

  bulkWrite(bulkUpdate: any[]) {
    return this.holdersModel.bulkWrite(bulkUpdate);
  }

  holders(network: Network, mint: string) {
    return this.holdersModel.find({ network, mint }, { owner: 1, last_updated: 1 });
  }

  holder(network: Network, mint: string, owner: string) {
    return this.holdersModel.findOne({ network, mint, owner }, { amount: 1 });
  }

  userHolders(network: Network, mints: string[], allAvailableAddresses: string[]) {
    return this.holdersModel.find(
      {
        $and: [
          { network },
          { mint: { $in: mints } },
          { owner: { $in: allAvailableAddresses } },
        ],
      },
      { mint: 1, owner: 1, amount: 1 },
    );
  }

  userHolderParticipateds(network: Network, mints: string[], addressParticipated: string[]) {
    return this.holdersModel.find(
      { network, mint: { $in: mints }, owner: { $in: addressParticipated } },
      { mint: 1, owner: 1, amount: 1 },
    );
  }
}
