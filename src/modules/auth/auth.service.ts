import { utils } from "ethers";
import { UsersService } from "modules/users/users.service";
import { v4 as uuidv4 } from "uuid";

import { Injectable, UnauthorizedException } from "@nestjs/common";

import { AuthMessage } from "./constants/auth-message.enum";
import { TokenTypes } from "./constants/token.constant";
import { LoginDto } from "./dto/login.dto";
import { IVerifySignature } from "./interfaces/token.interface";
import { TokensService } from "./token.service";
import { Network } from "common/enums/network.enum";
import nacl from "tweetnacl";
import { web3 } from "@project-serum/anchor";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";

@Injectable()
export class AuthService {
  constructor(private readonly tokenService: TokensService, private readonly userService: UsersService) {}

  async getNonce(address: string) {
    const user = await this.userService.findOrCreateUserByAddress(address, Network.solana);
    return {
      address: user.address,
      nonce: user.nonce,
    };
  }

  async decodeAccessToken(accessToken: string): Promise<any /*ResponseUsersDto*/> {
    const decodedToken: any = await this.tokenService.verifyToken(accessToken, TokenTypes.ACCESS);
    if (!decodedToken) {
      throw new UnauthorizedException("UNAUTHORIZED");
    }
    return decodedToken;
  }

  async logIn(loginDto: LoginDto) {
    const { address, signature, message = "nonce: " } = loginDto;
    const user = await this.userService.getUserByAddress(address);
    // // no signature so i commented these lines
    const isVerifiedUser = await this.verifySignatureSolana({
      signature: signature,
      address,
      message: message + user.nonce,
    });
    if (!isVerifiedUser) {
      throw new UnauthorizedException(AuthMessage.SIGNATURE_INVALID);
    }

    const [updatedUser, tokens] = await Promise.all([
      // update a new generated nonce to prevent user uses the current signature another time
      this.userService.updateNonce(user._id, uuidv4()),
      this.tokenService.generateAuthTokens(user),
    ]);
    // return
    return {
      user: updatedUser,
      tokens,
    };
  }

  async verifySignatureSolana(verifySignatureDto: IVerifySignature): Promise<boolean> {
    try {
      const { address, message, signature } = verifySignatureDto;
      const publicKey = new web3.PublicKey(address);
      return nacl.sign.detached.verify(new TextEncoder().encode(message), bs58.decode(signature), publicKey.toBuffer());
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  async logOut(refreshToken: string) {
    await this.tokenService.findAndRemoveRefreshToken(refreshToken);

    return {
      message: AuthMessage.LOGGED_OUT,
    };
  }

  async refreshToken(refreshToken: string) {
    const refreshTokenDoc = await this.tokenService.findAndRemoveRefreshToken(refreshToken);
    const userDoc = await this.userService.getUser(refreshTokenDoc.user);
    const newTokens = await this.tokenService.generateAuthTokens(userDoc);
    return {
      user: userDoc,
      tokens: newTokens,
    };
  }
}
