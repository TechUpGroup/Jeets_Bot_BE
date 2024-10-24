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
import { ContractsService } from "modules/contracts/contracts.service";
import { ContractName } from "common/constants/contract";
import { LogsService } from "modules/logs/logs.service";

@Injectable()
export class CampaignsService {
  constructor(
    @InjectModel(CAMPAIGNS_MODEL)
    private readonly campaignsModel: PaginateModel<CampaignsDocument>,
    @InjectModel(USER_CAMPAIGNS_MODEL)
    private readonly userCampaignsModel: PaginateModel<UserCampaignsDocument>,
    private readonly contractService: ContractsService,
    private readonly holdersService: HoldersService,
    private readonly pricesService: PricesService,
    private readonly usersService: UsersService,
    private readonly logsService: LogsService,
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
              input: "$details",
              as: "detail",
              in: {
                mint: "$$detail.mint",
                synbol: "$$detail.synbol",
                amount: { $toString: "$$detail.amount" },
              },
            },
          },
        },
      },
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
                      synbol: "$$detail.synbol",
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
          timestamp: 1,
          score: 1,
          start_holders: {
            $map: {
              input: "$start_holders",
              as: "start_holder",
              in: {
                mint: "$$start_holder.mint",
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
    const [resParticipated, allUsers] = await Promise.all([
      this.userHasParticipated(cids),
      this.usersService.getAllUsers()
    ]);
    const addressParticipated = resParticipated.map((a) => a.address);
    const allAddresses = allUsers.map((a) => a.address);
    const allAvailableAddresses = allAddresses.filter((a) => !addressParticipated.includes(a));
    const userHolders = await this.holdersService.userHolders(Network.solana, mints, allAvailableAddresses);
    const userMintHolders: any = {};
    for (const userHolder of userHolders) {
      if (!userMintHolders[userHolder.owner]) {
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
            start_holders: holders.map((a) => {
              return { mint: a.mint, amount: a.amount };
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
    const [{ campaigns, userMintHolders, resParticipated }, allPriceTokens, tokens] = await Promise.all([
      this.getUserParticipantedCampaign(),
      this.pricesService.getAllPriceToken(),
      this.contractService.getAllContractsByName(ContractName.TOKEN, Network.solana),
    ]);
    if (!allPriceTokens || !Object.keys(allPriceTokens).length || !tokens.length) {
      this.isRunningEndCampaign = false;
      this.logsService.createLog("syncEndCampaign", JSON.stringify(allPriceTokens) + "__" + JSON.stringify(tokens))
      return;
    }
    const bulkUpdate: any[] = [];
    const bulkUpdateCampaign: any[] = [];
    const bulkUpdateScore: any[] = [];
    for (const campaign of campaigns) {
      for (const [address, items] of Object.entries(userMintHolders)) {
        let minusScore = 0;
        const winners = (items as any[]).filter((item: any) => {
          const found = resParticipated.find((a) => a.address === item.owner);
          if (found) {
            const holder = found.start_holders.find((a) => a.mint === item.mint);
            if (holder) {
              const token = tokens.find((a) => a.contract_address === holder.mint);
              if (token) {
                minusScore = +BigNumber(allPriceTokens[holder.mint])
                  .multipliedBy(BigNumber(item.amount.toString()).minus(holder.amount.toString()))
                  .dividedBy(Math.pow(10, token?.decimal || 6))
                  .toFixed(0);
                minusScore = minusScore < 0 ? minusScore : 0;
              }
            }
          }
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
                  return { mint: a.mint, amount: a.amount };
                }),
                score: campaign.score + minusScore > 0 ? campaign.score + minusScore : 0,
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
                $inc: { score: campaign.score + minusScore > 0 ? campaign.score + minusScore : 0 },
              },
            },
          });
        } else {
          bulkUpdate.push({
            updateOne: {
              filter: {
                address,
                cid: campaign.cid,
              },
              update: {
                end_holders: (items as any[])
                  .filter((item) => campaign.details.map((a) => a.mint).includes(item.mint))
                  .map((a) => {
                    return { mint: a.mint, amount: a.amount };
                  }),
                score: minusScore,
                status: false,
              },
            },
          });
          bulkUpdateScore.push({
            updateOne: {
              filter: {
                address,
                score: { $gte: minusScore * -1 },
              },
              update: {
                $inc: { score: minusScore },
              },
            },
          });
          bulkUpdateScore.push({
            updateOne: {
              filter: {
                address,
                score: { $lt: minusScore * -1 },
              },
              update: {
                score: 0,
              },
            },
          });
        }
      }
    }
    await Promise.all([
      bulkUpdate.length ? this.userCampaignsModel.bulkWrite(bulkUpdate) : undefined,
      bulkUpdateScore.length ? this.usersService.bulkWrite(bulkUpdateScore) : undefined,
      bulkUpdateCampaign.length ? this.campaignsModel.bulkWrite(bulkUpdateCampaign) : undefined,
    ]);
    this.isRunningEndCampaign = false;
  }
}
