import { PaginateModel } from "mongoose";

import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { VOTINGS_MODEL, VotingsDocument } from "./schemas/votings.schema";
import { USER_VOTINGS_MODEL, UserVotingsDocument } from "./schemas/user-votings.schema";
import { UsersDocument } from "modules/users/schemas/users.schema";
import { SOCAIL_TYPE } from "common/enums/common";
import { WHITELIST_MODEL, WhitelistsDocument } from "./schemas/whitelist.schema";

@Injectable()
export class VotingsService {
  constructor(
    @InjectModel(VOTINGS_MODEL)
    private readonly votingsModel: PaginateModel<VotingsDocument>,
    @InjectModel(USER_VOTINGS_MODEL)
    private readonly userVotingsModel: PaginateModel<UserVotingsDocument>,
    @InjectModel(WHITELIST_MODEL)
    private readonly whitelistsModel: PaginateModel<WhitelistsDocument>
  ) {}

  async action(user: UsersDocument, id: string) {
  }

  async getUserVotings(user: UsersDocument) {
  }
}