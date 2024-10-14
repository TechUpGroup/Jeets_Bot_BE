import config from "common/config";

export enum ErrorMessages {
  ADDRESS_EXISTS = "Address already exists",
  ADDRESS_NOT_EXISTS = "Address not exists",
  USER_NOT_FOUND = "User not found",
}

export const AVATAR = [
  `https://${config.aws.domain}/${config.aws.s3_path.split("/")[0]}/avatar/Avatar_1.png`,
  `https://${config.aws.domain}/${config.aws.s3_path.split("/")[0]}/avatar/Avatar_2.png`,
  `https://${config.aws.domain}/${config.aws.s3_path.split("/")[0]}/avatar/Avatar_3.png`,
  `https://${config.aws.domain}/${config.aws.s3_path.split("/")[0]}/avatar/Avatar_4.png`,
  `https://${config.aws.domain}/${config.aws.s3_path.split("/")[0]}/avatar/Avatar_5.png`,
  `https://${config.aws.domain}/${config.aws.s3_path.split("/")[0]}/avatar/Avatar_6.png`,
]