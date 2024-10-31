import { Injectable } from "@nestjs/common";
import { XService } from "../../_shared/x/x.service";
// import { Cron, CronExpression } from "@nestjs/schedule";
import { X_MENTION_MODEL, XMentionDocument } from "modules/_shared/x/schemas/x-mentions.schema";
import { PaginateModel } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";

@Injectable()
export class XJobService {
  constructor(
    @InjectModel(X_MENTION_MODEL)
    protected readonly xMentionModel: PaginateModel<XMentionDocument>,
    private readonly xService: XService,
  ) {}

  // @Cron(CronExpression.EVERY_5_MINUTES)
  async syncMentions() {
    // TODO:
    const result = await this.xService.getMentions("");
    if (!result.length) {
      return;
    }
    const filter = result.filter((e) => e.text.match(/\$([^\s]+)([\s]+)([\s]+)/gim));
    await this.xMentionModel.bulkWrite(
      filter.map((e) => ({
        updateOne: {
          filter: {
            tid: e.id,
          },
          update: {
            uid: e.author_id,
            tid: e.id,
            text: e.text,
          },
          upsert: true,
        },
      })),
    );
  }

  // @Cron(CronExpression.EVERY_MINUTE)
  async deploy() {
    const mentions = await this.xMentionModel.find({ deployed: false }).limit(5);
    if (!mentions.length) return;
    await Promise.all(
      mentions.map(async (mention) => {
        // TODO: Deploy
        //
        // Post reply
        await this.xService.replyTweet("", mention.tid, "");
      }),
    );
  }
}
