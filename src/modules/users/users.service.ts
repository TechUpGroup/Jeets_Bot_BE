import { PaginateModel, Types } from "mongoose";

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { USERS_MODEL, UsersDocument } from "./schemas/users.schema";
import { ErrorMessages } from "./users.constant";
import { Network } from "common/enums/network.enum";
import { UpdateUserDto } from "./dto/user.dto";
import { S3Service } from "modules/_shared/services/s3.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(USERS_MODEL)
    private readonly usersModel: PaginateModel<UsersDocument>,
    private readonly s3Service: S3Service,
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

  async updateUser(user: UsersDocument, file: Express.Multer.File, body: UpdateUserDto) {
    let avatar;
    let username;
    if (file) {
      const fileName = `${user.address.substring(user.address.length - 4)}`;
      avatar = await this.s3Service.uploadImage(fileName, file);
    }
    if (body?.username) {
      username = `${user.username}`;
    }
    return this.usersModel.updateOne({ _id: user._id }, { ...body, avatar, username });
  }
}
