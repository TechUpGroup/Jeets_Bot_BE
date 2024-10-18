import { Injectable } from "@nestjs/common";
import axios from "axios";
import config from "common/config";
import { UsersDocument } from "modules/users/schemas/users.schema";

@Injectable()
export class TelegramService {
  async checkSubscribeTelegram(user: UsersDocument, chat: string) {
    try {
      const info = await this.getInfo(chat, user.telegram_uid);
      if (info.status === "member" || info.status === "administrator" || info.status === "creator") {
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  }

  private async getInfo(chatId: string, uid: number) {
    try {
      const response = await axios.get(`https://api.telegram.org/bot${config.telegram.api_key}/getChatMember`, {
        params: {
          chat_id: chatId,
          user_id: uid,
        },
      });
      if (response.data) {
        return response.data.result;
      }
      return;
    } catch (error) {
      throw error;
    }
  }
}
