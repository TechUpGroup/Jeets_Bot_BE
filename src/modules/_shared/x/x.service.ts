import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { PaginateModel } from "mongoose";
import { X_AUTH_MODEL, XAuthDocument } from "./schemas/x-auth.schema";
import config from "common/config";
import TwitterApi, { IParsedOAuth2TokenResult } from "twitter-api-v2";

@Injectable()
export class XService {
  private appClient = new TwitterApi();

  constructor(
    @InjectModel(X_AUTH_MODEL)
    protected readonly xAuthModel: PaginateModel<XAuthDocument>,
  ) {
    this.initAppClient();
  }

  initAppClient() {
    this.appClient = new TwitterApi({
      clientId: config.twitter.clientId,
      clientSecret: config.twitter.clientSecret,
    });
  }

  async getAccessToken(uid: string) {
    const auth = await this.xAuthModel.findOne({ uid });
    if (!auth) {
      return;
    }

    // return old access token if not expired
    if (auth.expireDate >= new Date()) {
      console.log(`Using accessToken of ${auth.uid}`);
      return auth.accessToken;
    }

    // obtain new access token if expired
    console.log(`getAccessToken: obtaining accessToken of ${auth.uid}`);
    const token = await this.obtainingRefreshToken(auth.refreshToken);
    if (!token) {
      throw new BadRequestException("getAccessToken: cannot obtaining new token");
    }
    auth.accessToken = token.accessToken;
    auth.refreshToken = token.refreshToken!;
    auth.expireDate = new Date(new Date().getTime() + token.expiresIn * 1_000);
    await auth.save();
    return token.accessToken;
  }

  async updateToken(uid: string, result: Pick<IParsedOAuth2TokenResult, "accessToken" | "refreshToken" | "expiresIn">) {
    // save to db
    const auth = await this.xAuthModel.findOne({ uid });
    if (auth) {
      auth.accessToken = result.accessToken;
      auth.refreshToken = result.refreshToken!;
      auth.expireDate = new Date(new Date().getTime() + result.expiresIn * 1_000);
    } else {
      await this.xAuthModel.create({
        uid,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken!,
        expireDate: new Date(new Date().getTime() + result.expiresIn * 1_000),
      });
    }
  }

  async obtainingAccessToken(code: string) {
    const result = await this.appClient
      .loginWithOAuth2({
        code,
        codeVerifier: "challenge",
        redirectUri: config.twitter.callbackURL,
      })
      .catch((err) => console.error(JSON.stringify(err, null, 2)));
    if (!result) {
      throw new BadRequestException("Cannot get obtaining accessToken");
    }
    return result;
  }

  private async obtainingRefreshToken(refreshToken: string) {
    const result = await this.appClient.refreshOAuth2Token(refreshToken).catch(console.error);
    if (!result) {
      throw new BadRequestException("Cannot get obtaining refreshToken");
    }
    return result;
  }
}
