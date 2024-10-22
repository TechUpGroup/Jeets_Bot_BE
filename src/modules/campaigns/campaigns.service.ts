import { PaginateModel } from "mongoose";

import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { CAMPAIGNS_MODEL, CampaignsDocument } from "./schemas/campaigns.schema";
import { USER_CAMPAIGNS_MODEL, UserCampaignsDocument } from "./schemas/user-campaigns.schema";
import { UsersDocument } from "modules/users/schemas/users.schema";
import config from "common/config";
import { CreateNewCampaignDto } from "./dto/campaigns.dto";
import { PaginationDtoAndSortDto } from "common/dto/pagination.dto";
import { Cron, CronExpression } from "@nestjs/schedule";
import { HoldersService } from "modules/holders/holders.service";
import { Network } from "common/enums/network.enum";
import BigNumber from "bignumber.js";
import { PricesService } from "modules/_shared/services/price.service";
import { UsersService } from "modules/users/users.service";

@Injectable()
export class CampaignsService {
  constructor(
    @InjectModel(CAMPAIGNS_MODEL)
    private readonly campaignsModel: PaginateModel<CampaignsDocument>,
    @InjectModel(USER_CAMPAIGNS_MODEL)
    private readonly userCampaignsModel: PaginateModel<UserCampaignsDocument>,
    private readonly holdersService: HoldersService,
    private readonly pricesService: PricesService,
    private readonly usersService: UsersService,
  ) {}

  async getListCampaigns(query: PaginationDtoAndSortDto) {
    const { limit, page, sortBy = "start_time", sortType = -1 } = query;
    const aggregate = this.campaignsModel.aggregate([
      {
        $sort: {
          [sortBy]: sortType,
        },
      },
      {
        $project: {
          cid: 1,
          name: 1,
          type: 1,
          start_time: 1,
          end_time: 1,
          score: 1,
          details: {
            $map: {
              input: '$details',
              as: 'detail',
              in: {
                mint: '$$detail.mint',
                synbol: '$$detail.synbol',
                amount: { $toString: '$$detail.amount' }
              }
            }
          }
        }
      }
    ]);
    return this.campaignsModel.aggregatePaginate(aggregate, { limit, page });
  }

  async createNewCampaign(auth: string, body: CreateNewCampaignDto) {
    if (auth !== config.admin) {
      throw new UnauthorizedException("Not permission");
    }
    try {
      const lastS = await this.campaignsModel.find().sort({ cid: -1 }).limit(1);
      const currentCID = lastS.length ? lastS[0].cid + 1 : 1;
      const data: any = {
        ...body,
        cid: currentCID,
      };
      return this.campaignsModel.create(data);
    } catch (e) {
      throw new BadRequestException(e);
    }
  }

  async getCampaignHistories(user: UsersDocument, query: PaginationDtoAndSortDto) {
    const { limit, page, sortBy = "timestamp", sortType = -1 } = query;
    const aggregate = this.userCampaignsModel.aggregate([
      {
        $match: {
          address: user.address,
          status: false,
        },
      },
      {
        $sort: {
          [sortBy]: sortType,
        },
      },
      {
        $lookup: {
          from: CAMPAIGNS_MODEL,
          localField: "cid",
          foreignField: "cid",
          as: "campaign",
          pipeline: [
            {
              $project: {
                cid: 1,
                name: 1,
                type: 1,
                start_time: 1,
                end_time: 1,
                score: 1,
                details: {
                  $map: {
                    input: '$details',
                    as: 'detail',
                    in: {
                      mint: '$$detail.mint',
                      synbol: '$$detail.synbol',
                      amount: { $toString: '$$detail.amount' }
                    }
                  }
                }
              }
            }
          ]
        },
      },
      {
        $unwind: {
          path: "$campaign",
          preserveNullAndEmptyArrays: true,
        },
      }
    ]);
    return this.campaignsModel.aggregatePaginate(aggregate, { limit, page });
  }

  async getCampaignStartToDay() {
    const timestamp = new Date();
    timestamp.setHours(0, 0, 0);
    return this.campaignsModel.find({
      $and: [
        {
          start_time: { $gte: timestamp.getTime() },
        },
        { start_time: { $lt: timestamp.getTime() + 86400000 } },
      ],
    });
  }

  async getCampaignEnded() {
    return this.campaignsModel.find({
      status: true,
      end_time: { $lt: Date.now() },
    });
  }

  userHasParticipated(cids: number[]) {
    return this.userCampaignsModel.find({
      status: true,
      cid: { $in: cids },
    });
  }

  async getUserAvailableParticipantCampaign() {
    const campaigns = await this.getCampaignStartToDay();
    const cids = campaigns.map((a) => a.cid);
    const mints: string[] = [];
    for (const campaign of campaigns) {
      for (const item of campaign.details) {
        if (!mints.includes(item.mint)) {
          mints.push(item.mint);
        }
      }
    }
    const resParticipated = await this.userHasParticipated(cids);
    const addressParticipated = resParticipated.map((a) => a.address);
    const userHolders = await this.holdersService.userHolders(Network.solana, mints, addressParticipated);
    const userMintHolders: any = {};
    for (const userHolder of userHolders) {
      if (userMintHolders[userHolder.owner]) {
        userMintHolders[userHolder.owner] = [];
      }
      userMintHolders[userHolder.owner].push(userHolder);
    }
    return { campaigns, userMintHolders };
  }

  async getUserParticipantedCampaign() {
    const campaigns = await this.getCampaignEnded();
    const cids = campaigns.map((a) => a.cid);
    const mints: string[] = [];
    for (const campaign of campaigns) {
      for (const item of campaign.details) {
        if (!mints.includes(item.mint)) {
          mints.push(item.mint);
        }
      }
    }
    const resParticipated = await this.userHasParticipated(cids);
    const addressParticipated = resParticipated.map((a) => a.address);
    const userHolders = await this.holdersService.userHolderParticipateds(Network.solana, mints, addressParticipated);
    const userMintHolders: any = {};
    for (const userHolder of userHolders) {
      if (userMintHolders[userHolder.owner]) {
        userMintHolders[userHolder.owner] = [];
      }
      userMintHolders[userHolder.owner].push(userHolder);
    }
    return { campaigns, userMintHolders, resParticipated };
  }

  private isRunningStartCampaign = false;
  @Cron(CronExpression.EVERY_10_MINUTES, { name: "syncStartCampaign" })
  async syncStartCampaign() {
    if (this.isRunningStartCampaign) return;
    this.isRunningStartCampaign = true;
    const { campaigns, userMintHolders } = await this.getUserAvailableParticipantCampaign();
    const bulkCreate: any[] = [];
    for (const campaign of campaigns) {
      for (const [address, items] of Object.entries(userMintHolders)) {
        const holders = (items as any[]).filter((item: any) => {
          const campaignHolder = campaign.details.find((a) => a.mint === item.mint);
          return campaignHolder && BigNumber(item.amount.toString()).gte(campaignHolder.amount.toString());
        });
        if (holders.length === campaign.details.length) {
          bulkCreate.push({
            address,
            cid: campaign.cid,
            start_holders: holders,
            status: true,
          });
        }
      }
    }
    await Promise.all([bulkCreate.length ? this.userCampaignsModel.bulkWrite(bulkCreate) : undefined]);
    this.isRunningStartCampaign = false;
  }

  private isRunningEndCampaign = false;
  @Cron(CronExpression.EVERY_10_MINUTES, { name: "syncEndCampaign" })
  async syncEndCampaign() {
    if (this.isRunningEndCampaign) return;
    this.isRunningEndCampaign = true;
    const [{ campaigns, userMintHolders, resParticipated }, allPriceTokens] = await Promise.all([
      this.getUserParticipantedCampaign(),
      this.pricesService.getAllPriceToken(),
    ]);
    const bulkUpdate: any[] = [];
    const bulkUpdateScore: any[] = [];
    for (const campaign of campaigns) {
      for (const [address, items] of Object.entries(userMintHolders)) {
        const winners = (items as any[]).filter((item: any) => {
          const campaignHolder = campaign.details.find((a) => a.mint === item.mint);
          return campaignHolder && BigNumber(item.amount.toString()).gte(campaignHolder.amount.toString());
        });
        if (winners.length === campaign.details.length) {
          bulkUpdate.push({
            updateOne: {
              filter: {
                address,
                cid: campaign.cid,
              },
              update: {
                end_holders: winners,
                score: campaign.score,
                status: false,
              },
            },
          });
          bulkUpdateScore.push({
            updateOne: {
              filter: {
                address,
              },
              update: {
                $inc: { score: campaign.score },
              },
            },
          });
        } else {
          (items as any[]).forEach((item: any) => {
            const found = resParticipated.find((a) => a.address === item.owner);
            if (found) {
              const token = found.start_holders.find((a) => a.mint === item.mint);
              if (token) {
                const amoutnSOL = +BigNumber(allPriceTokens)
                  .multipliedBy(BigNumber(item.amount.toString()).minus(token.amount.toString()))
                  .toFixed(0);
                bulkUpdate.push({
                  updateOne: {
                    filter: {
                      address,
                      cid: campaign.cid,
                    },
                    update: {
                      end_holders: winners,
                      score: amoutnSOL * -1,
                      status: false,
                    },
                  },
                });
                bulkUpdateScore.push({
                  updateOne: {
                    filter: {
                      address,
                    },
                    update: {
                      $inc: { score: amoutnSOL * -1 },
                    },
                  },
                });
              }
            }
          });
        }
      }
    }
    await Promise.all([
      bulkUpdate.length ? this.userCampaignsModel.bulkWrite(bulkUpdate) : undefined,
      bulkUpdateScore.length ? this.usersService.bulkWrite(bulkUpdateScore) : undefined,
    ]);
    this.isRunningEndCampaign = false;
  }
}
