import { PaginateModel } from "mongoose";

import { BadRequestException, forwardRef, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { CAMPAIGNS_MODEL, CampaignsDocument } from "./schemas/campaigns.schema";
import { USER_CAMPAIGNS_MODEL, UserCampaigns, UserCampaignsDocument } from "./schemas/user-campaigns.schema";
import { UsersDocument } from "modules/users/schemas/users.schema";
import config from "common/config";
import { CreateNewCampaignDto } from "./dto/campaigns.dto";
import { PaginationDtoAndSortDto } from "common/dto/pagination.dto";
import { Cron, CronExpression } from "@nestjs/schedule";
import { HoldersService } from "modules/holders/holders.service";
import { Network } from "common/enums/network.enum";
import BigNumber from "bignumber.js";
import { UsersService } from "modules/users/users.service";
import { ContractsService } from "modules/contracts/contracts.service";
import { TIMESTAM_HOUR, TIMESTAMP_DAY } from "common/constants/asset";
import { EVENT_CAMPAGIN_HISTORIES, EVENT_SCORE } from "common/constants/event";
import { CAMPAIGN_TYPE } from "common/enums/common";

@Injectable()
export class CampaignsService {
  constructor(
    @InjectModel(CAMPAIGNS_MODEL)
    private readonly campaignsModel: PaginateModel<CampaignsDocument>,
    @InjectModel(USER_CAMPAIGNS_MODEL)
    private readonly userCampaignsModel: PaginateModel<UserCampaignsDocument>,
    private readonly contractService: ContractsService,
    private readonly holdersService: HoldersService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {
    void this.syncStartCampaign();
  }

  saveUserCampagignHistories(items: UserCampaigns | UserCampaigns[]) {
    if (Array.isArray(items)) {
      return this.userCampaignsModel.insertMany(items);
    }
    return this.userCampaignsModel.create(items);
  }

  async getListCampaigns(user: UsersDocument, query: PaginationDtoAndSortDto) {
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
              input: "$details",
              as: "detail",
              in: {
                mint: "$$detail.mint",
                symbol: "$$detail.symbol",
                decimal: "$$detail.decimal",
                amount: { $toString: "$$detail.amount" },
              },
            },
          },
        },
      },
    ]);
    const [campaigns, userHolder] = await Promise.all([
      this.campaignsModel.aggregatePaginate(aggregate, { limit, page }),
      this.holdersService.userHolder(user),
    ]);
    const newDocs: any[] = [];
    for (const data of campaigns.docs) {
      let statusHold = false;
      const holders = userHolder.filter((item: any) => {
        const campaignHolder = data.details.find((a) => a.mint === item.mint);
        return campaignHolder && BigNumber(item.amount.toString()).gte(campaignHolder.amount.toString());
      });
      if (holders.length === data.details.length) {
        statusHold = true;
      }
      newDocs.push({
        ...data,
        statusHold,
      });
    }

    return { ...campaigns, docs: newDocs };
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
        is_origin: true,
      };
      await this.contractService.createContracts(body.details);
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
                    input: "$details",
                    as: "detail",
                    in: {
                      mint: "$$detail.mint",
                      symbol: "$$detail.symbol",
                      decimal: "$$detail.decimal",
                      amount: { $toString: "$$detail.amount" },
                    },
                  },
                },
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$campaign",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          campaign: 1,
          address: 1,
          event: 1,
          detail: {
            mint: "$detail.mint",
            symbol: "$detail.symbol",
            decimal: "$detail.decimal",
            amount: { $toString: "$detail.amount" },
          },
          is_buy: 1,
          is_send: 1,
          tx: 1,
          timestamp: 1,
          score: 1,
          start_holders: {
            $map: {
              input: "$start_holders",
              as: "start_holder",
              in: {
                mint: "$$start_holder.mint",
                symbol: "$$start_holder.symbol",
                decimal: "$$start_holder.decimal",
                amount: { $toString: "$$start_holder.amount" },
              },
            },
          },
          end_holders: {
            $map: {
              input: "$end_holders",
              as: "end_holder",
              in: {
                mint: "$$end_holder.mint",
                symbol: "$$end_holder.symbol",
                decimal: "$$end_holder.decimal",
                amount: { $toString: "$$end_holder.amount" },
              },
            },
          },
        },
      },
    ]);
    return this.userCampaignsModel.aggregatePaginate(aggregate, { limit, page });
  }

  async getCampaignStartToDay() {
    const timestamp = new Date();
    timestamp.setHours(0, 0, 0, 0);
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
    const [resParticipated, allUsers] = await Promise.all([
      this.userHasParticipated(cids),
      this.usersService.getAllUsersVerified(),
    ]);
    const allAddresses = allUsers.map((a) => a.address);
    const userHolders = await this.holdersService.userHolders(Network.solana, mints, allAddresses);
    const userMintHolders: any = {};
    for (const userHolder of userHolders) {
      if (!userMintHolders[userHolder.owner]) {
        userMintHolders[userHolder.owner] = [];
      }
      userMintHolders[userHolder.owner].push(userHolder);
    }
    return { campaigns, userMintHolders, resParticipated };
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
      if (!userMintHolders[userHolder.owner]) {
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
    const { campaigns, userMintHolders, resParticipated } = await this.getUserAvailableParticipantCampaign();
    const bulkCreate: any[] = [];
    for (const campaign of campaigns) {
      for (const [address, items] of Object.entries(userMintHolders)) {
        const check = resParticipated.find((a) => a.cid === campaign.cid && a.address === address);
        const holders = (items as any[]).filter((item: any) => {
          const campaignHolder = campaign.details.find((a) => a.mint === item.mint);
          return campaignHolder && BigNumber(item.amount.toString()).gte(campaignHolder.amount.toString());
        });
        if (!check && holders.length === campaign.details.length) {
          bulkCreate.push({
            event: EVENT_CAMPAGIN_HISTORIES.HOLD,
            address,
            cid: campaign.cid,
            start_holders: holders.map((a) => {
              const campaignHolder = campaign.details.find((b) => b.mint === a.mint);
              return {
                mint: a.mint,
                amount: a.amount,
                symbol: campaignHolder?.symbol,
                decimal: campaignHolder?.decimal,
              };
            }),
            status: true,
          });
        }
      }
    }
    await Promise.all([bulkCreate.length ? this.userCampaignsModel.insertMany(bulkCreate) : undefined]);
    this.isRunningStartCampaign = false;
  }

  private isRunningEndCampaign = false;
  @Cron(CronExpression.EVERY_10_MINUTES, { name: "syncEndCampaign" })
  async syncEndCampaign() {
    if (this.isRunningEndCampaign) return;
    this.isRunningEndCampaign = true;
    const { campaigns, userMintHolders } = await this.getUserParticipantedCampaign();
    const bulkUpdate: any[] = [];
    const bulkUpdateCampaign: any[] = [];
    const bulkUpdateScore: any[] = [];
    const bulkUpdateScoreHistories: any[] = [];
    for (const campaign of campaigns) {
      for (const [address, items] of Object.entries(userMintHolders)) {
        const winners = (items as any[]).filter((item: any) => {
          const campaignHolder = campaign.details.find((a) => a.mint === item.mint);
          return campaignHolder && BigNumber(item.amount.toString()).gte(campaignHolder.amount.toString());
        });
        bulkUpdateCampaign.push({
          updateOne: {
            filter: {
              cid: campaign.cid,
            },
            update: {
              status: false,
            },
          },
        });
        if (winners.length === campaign.details.length) {
          bulkUpdate.push({
            updateOne: {
              filter: {
                address,
                cid: campaign.cid,
              },
              update: {
                end_holders: winners.map((a) => {
                  const campaignHolder = campaign.details.find((b) => b.mint === a.mint);
                  return {
                    mint: a.mint,
                    amount: a.amount,
                    symbol: campaignHolder?.symbol,
                    decimal: campaignHolder?.decimal,
                  };
                }),
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
          bulkUpdateScoreHistories.push({
            address,
            event: EVENT_SCORE.CAMPAIGN_HOLD_TOKEN,
            score: campaign.score,
          });
        }
      }
    }
    await Promise.all([
      bulkUpdate.length ? this.userCampaignsModel.bulkWrite(bulkUpdate) : undefined,
      bulkUpdateScore.length ? this.usersService.bulkWrite(bulkUpdateScore) : undefined,
      bulkUpdateScoreHistories.length ? this.usersService.saveUserScoreHistories(bulkUpdateScoreHistories) : undefined,
      bulkUpdateCampaign.length ? this.campaignsModel.bulkWrite(bulkUpdateCampaign) : undefined,
    ]);
    this.isRunningEndCampaign = false;
  }

  // @Cron("0 0 * * 1", { name: "syncResetCampaign" })
  @Cron(CronExpression.EVERY_HOUR, { name: "syncResetCampaign" })
  async syncResetCampaign() {
    const timestamp = Date.now();
    const [campaigns, lastS] = await Promise.all([
      this.campaignsModel.find({ is_origin: true, type: CAMPAIGN_TYPE.HOLD_TOKEN }).sort({ cid: 1 }),
      this.campaignsModel.find().sort({ cid: -1 }).limit(1),
    ]);
    const currentCID = lastS.length ? lastS[0].cid : 0;
    const bulkCreate: any[] = [];
    campaigns.forEach((campaign, i) => {
      bulkCreate.push({
        cid: currentCID + i + 1,
        name: campaign.name,
        type: campaign.type,
        details: campaign.details,
        score: campaign.score,
        start_time: timestamp,
        end_time: timestamp + TIMESTAM_HOUR - 1,
        status: true,
      });
    });
    await Promise.all([bulkCreate.length ? this.campaignsModel.insertMany(bulkCreate) : undefined]);
  }
}
