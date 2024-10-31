import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { PaginateModel } from "mongoose";
import { X_AUTH_MODEL, XAuthDocument } from "./schemas/x-auth.schema";
import config from "common/config";
import TwitterApi, { IParsedOAuth2TokenResult, SendTweetV2Params, UsersV2Params } from "twitter-api-v2";

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

  async isFollowing(originUid: string, targetUid: string) {
    const token = await this.getAccessToken(originUid);
    const twitterClient = new TwitterApi(token);
    const follow = await twitterClient.v2.follow(originUid, targetUid).catch(console.error);
    if (!follow) {
      throw new BadRequestException("isFollowing: cannot process follow.");
    }
    return follow.data.following || follow.data.pending_follow;
  }

  async isLiking(originUid: string, targetTweetId: string) {
    const token = await this.getAccessToken(originUid);
    const twitterClient = new TwitterApi(token);
    const liking = await twitterClient.v2.like(originUid, targetTweetId).catch(console.error);
    if (!liking) {
      throw new BadRequestException("isLiking: cannot process like.");
    }
    return liking.data.liked;
  }

  async isRetweet(originUid: string, targetTweetId: string) {
    const token = await this.getAccessToken(originUid);
    const twitterClient = new TwitterApi(token);
    const retweet = await twitterClient.v2.retweet(originUid, targetTweetId).catch((err) => {
      if (err.errors?.[0]?.message?.indexOf("retweeted") > -1) {
        return {
          data: {
            retweeted: true,
          },
        };
      }
      console.error(err);
    });
    if (!retweet) {
      throw new BadRequestException("isRetweet: cannot process retweet.");
    }
    return retweet.data.retweeted;
  }

  async getUserInfo(username: string, options?: Partial<UsersV2Params>) {
    const auth = await this.xAuthModel.findOne({}).sort({ updatedAt: -1 });
    if (!auth) {
      throw new BadRequestException("getUserInfo: access token not exists");
    }
    const token = await this.getAccessToken(auth.uid);
    const twitterClient = new TwitterApi(token);
    const data = await twitterClient.v2.userByUsername(username, options);
    return data.data;
  }

  async getMentions(uid: string) {
    const token = await this.getAccessToken();
    const twitterClient = new TwitterApi(token);
    const mentions = await twitterClient.v2
      .userMentionTimeline(uid, { max_results: 100, expansions: ["author_id"] })
      .catch(console.error);
    return mentions?.data.data || [];
  }

  async postTweet(uid: string, content: string, payload: Partial<SendTweetV2Params>) {
    const token = await this.getAccessToken(uid);
    const twitterClient = new TwitterApi(token);
    const result = await twitterClient.v2.tweet(content, payload).catch(console.error);
    if (!result) {
      return false;
    }
    return result.data;
  }

  async replyTweet(uid: string, tid: string, content: string) {
    const result = await this.postTweet(uid, content, { reply: { in_reply_to_tweet_id: tid } }).catch(console.error);
    return result;
  }

  async getAccessToken(uid?: string) {
    const auth = await this.xAuthModel.findOne(uid ? { uid } : {}).sort({ updatedAt: -1 });
    if (!auth) {
      throw new BadRequestException("getAccessToken: access token not exists");
    }

    // return old access token if not expired
    if (auth.expireDate >= new Date()) {
      console.log(`Using accessToken of ${auth.uid}`);
      // update last used
      await auth.save();
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
      await auth.save();
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
    let errorMessage = "";
    const result = await this.appClient
      .loginWithOAuth2({
        code,
        codeVerifier: "challenge",
        redirectUri: config.twitter.callbackURL,
      })
      .catch((err) => {
        errorMessage = err?.data?.error_description;
        console.error(JSON.stringify(err, null, 2));
      });
    if (!result) {
      throw new BadRequestException("Cannot obtaining accessToken" + (errorMessage ? ": " + errorMessage : ""));
    }
    return result;
  }

  private async obtainingRefreshToken(refreshToken: string) {
    const result = await this.appClient.refreshOAuth2Token(refreshToken).catch(console.error);
    if (!result) {
      throw new BadRequestException("Cannot obtaining refreshToken");
    }
    return result;
  }
}
