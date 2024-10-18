import { PaginateModel, Types } from "mongoose";

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { USERS_MODEL, UsersDocument } from "./schemas/users.schema";
import { ErrorMessages } from "./users.constant";
import { Network } from "common/enums/network.enum";
import { base64Encode, telegramCheckAuth } from "common/utils";
import { ConnectTelegramDto, ConnectTwitterDto } from "./dto/twitter.dto";
import axios from "axios";
import config from "common/config";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(USERS_MODEL)
    private readonly usersModel: PaginateModel<UsersDocument>,
  ) {}

  async queryUsers(filter: any, options: any) {
    const users = await this.usersModel.paginate(filter, options);
    return users;
  }

  async isAddressTaken(address: string) {
    const checkAddress = await this.usersModel.findOne({
      address,
    });
    if (checkAddress) {
      return true;
    }
    return false;
  }

  async create(address: string, network: Network) {
    const isAddressTaken = await this.isAddressTaken(address);
    if (isAddressTaken) {
      throw new BadRequestException(ErrorMessages.ADDRESS_EXISTS);
    }
    return this.usersModel.create({ address, network });
  }

  async getUser(id: string) {
    const user = await this.usersModel.findById(id);
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return user;
  }

  async getUserById(id: string) {
    return await this.usersModel.findById(id);
  }

  async updateNonce(id: string, nonce: string) {
    const user = await this.usersModel.findOneAndUpdate({ _id: id }, { nonce }, { new: true });
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return user;
  }

  async getUserByAddress(address: string) {
    const user = await this.findUserByAddress(address);
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return user;
  }

  async getUsersByAddresses(addresses: string[]) {
    return this.usersModel.find({ address: { $in: addresses } });
  }

  async findUserByAddress(address: string) {
    const user = await this.usersModel.findOne({ address });
    return user;
  }

  async findUserByUID(telegram_uid: number) {
    const user = await this.usersModel.findOne({ telegram_uid });
    return user;
  }

  async findUserById(id: string) {
    const user = await this.usersModel.findById(id);
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return user;
  }

  async findOrCreateUserByAddress(address: string, network: Network) {
    const user = await this.findUserByAddress(address);
    if (!user) {
      return await this.create(address, network);
    }
    return user;
  }

  async deleteUser(id: string) {
    const user = await this.usersModel.findOneAndDelete({ _id: id });
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return user;
  }

  async getInfoUser(username: string) {
    const user = await this.usersModel.findOne(
      { $or: [{ username }, { address: username }], banned: false },
      {
        _id: 1,
        address: 1,
        nonce: 1,
        banned: 1,
        balance: 1,
      },
    );
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return user;
  }

  async getUserByCode(code: string) {
    const user = await this.usersModel.findOne({ code });
    if (!user) {
      throw new NotFoundException("Code is invalid");
    }
    return user;
  }

  async getListUserByIds(ids: string[]) {
    const users = await this.usersModel.find({ _id: { $in: ids.map((i) => new Types.ObjectId(i)) } });
    return users;
  }

  async checkUsernameExists(username: string) {
    const user = await this.usersModel.findOne({ username }, { _id: 1 });
    return !!user;
  }

  updateBalance(id: string, amount: number) {
    return this.usersModel.updateOne({ _id: new Types.ObjectId(id) }, { $inc: { balance: amount } });
  }

  bulkBalance(bulkUpdate: any[]) {
    return this.usersModel.bulkWrite(bulkUpdate);
  }

  async connectTelegram(user: UsersDocument, data: ConnectTelegramDto) {
    const base64 = data.code.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(""),
    );
    const userInfo = JSON.parse(jsonPayload);

    if (user.telegram_uid) {
      throw new BadRequestException(
        "User with this wallet address already connected telegram with telegram_uid " + user.telegram_uid,
      );
    }
    // validate hash
    if (!telegramCheckAuth(userInfo)) {
      throw new BadRequestException("Hash not matched or expired");
    }

    try {
      await this.usersModel.findByIdAndUpdate(user._id, {
        $set: {
          telegram_uid: userInfo.id,
          telegram_username: userInfo.username,
        },
      });

      return userInfo;
    } catch (error) {
      console.error("Error:", error.message);
      throw new BadRequestException("Internal Server Error");
    }
  }

  async getAccessToken(code: string) {
    const data = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: config.twitter.clientId,
      redirect_uri: config.twitter.callbackURL,
      code_verifier: "challenge",
    }).toString();
    const result = await axios
      .post("https://api.twitter.com/2/oauth2/token", data, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${base64Encode(`${config.twitter.clientId}:${config.twitter.clientSecret}`)}`,
        },
      })
      .catch((error) => {
        console.error(data, error?.response?.data || error);
      });

    //
    if (!result) {
      throw new BadRequestException("Cannot get access_token");
    }
    return result.data.access_token;
  }

  async twitterConnect(user: UsersDocument, { code }: ConnectTwitterDto) {
    if (user.twitter_uid) {
      throw new BadRequestException(
        "User with this wallet address already connected twitter with twitter_uid " + user.twitter_uid,
      );
    }
    const [userInfo, access_token] = await Promise.all([this.getUser(user._id), this.getAccessToken(code)]);
    const uinfo = await axios
      .get("https://api.twitter.com/2/users/me", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
      })
      .catch((error) => {
        console.error({ access_token }, error?.response?.data || error);
      });

    if (!uinfo) {
      throw new BadRequestException("Cannot get user_info");
    }

    // save
    const { data: tinfo } = uinfo.data;
    userInfo.twitter_uid = tinfo.id;
    userInfo.twitter_username = tinfo.username;
    userInfo.twitter_avatar = tinfo?.profile_image_url;
    return userInfo.save();
  }
}
