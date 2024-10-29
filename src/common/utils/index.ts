import BigNumber from "bignumber.js";
import ShortUniqueId from "short-unique-id";
import crypto from "crypto";
import config from "common/config";

const uid = new ShortUniqueId({ dictionary: "hex", length: 15 });

export { uid };

export const base64Encode = (str: string) => {
  return Buffer.from(str).toString("base64");
};

export const base64Decode = (base64: string) => {
  return Buffer.from(base64, "base64").toString("utf-8");
};

export const callTimeExecute = (startTime: any) => {
  const endTime = process.hrtime(startTime);
  return Math.round(endTime[0] * 1e3 + endTime[1] / 1e6);
};

export function convertToSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
}

export function removeSpace(text: string) {
  return text.replace(/  +/g, " ").trim();
}

export const convertWeiToEther = (value: string): string => {
  if (value === "0") return "0";
  return BigNumber(value).div(Math.pow(10, 18)).toFixed();
};

export const convertEtherToWei = (value: string): string => {
  return BigNumber(value).multipliedBy(Math.pow(10, 18)).toFixed();
};

export const containsAElement = (arr1, arr2) => {
  return arr1.some((element) => arr2.includes(element));
};

export const containsAllElements = (arr1, arr2) => {
  return arr2.every((element) => arr1.includes(element));
};

export const containsArray2AllElements = (arr1, arr2) => {
  const arr = arr1.map((row) => [...row]).reduce((acc, curr) => acc.concat(curr), []);
  return arr2.every((element) => arr.includes(element));
};

export const conventArrayToArray2 = (arr: string[], n: number, s?: number): string[][] => {
  const newArr: string[][] = [];
  arr.forEach((a, i) => {
    if (s) {
      if (s > i && a) {
        if (i % s) {
          newArr[Math.floor(i / s)].push(a);
        } else {
          newArr[Math.floor(i / s)] = [];
          newArr[Math.floor(i / s)].push(a);
        }
      } else {
        const k = i - s;
        if (k % n) {
          newArr[Math.floor(k / n + 1)].push(a);
        } else {
          newArr[Math.floor(k / n + 1)] = [];
          newArr[Math.floor(k / n + 1)].push(a);
        }
      }
    } else if (a) {
      if (i % n) {
        newArr[Math.floor(i / n)].push(a);
      } else {
        newArr[Math.floor(i / n)] = [];
        newArr[Math.floor(i / n)].push(a);
      }
    }
  });
  return newArr;
};

export function getDateUTC() {
  const date = new Date();
  const now_utc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  );

  return new Date(now_utc);
}

export const getShortDate = (timestamp: string) => {
  const today = new Date(timestamp);
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0"); // Months are 0-based
  const year = today.getFullYear();

  return `${month}/${day}/${year}`;
};

export const formatDateTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${month}-${day}-${year} ${hours}:${minutes}:${seconds}`;
};

export const convertWeiToEtherCustomFormat = (value: string): string => {
  if (value === "0") return "0";
  const res = BigNumber(value).div(Math.pow(10, 18)).toFixed(2);

  const [integerPart, decimalPart] = res.split(".");
  const formattedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${formattedIntegerPart}.${decimalPart}`;
};

export const generateRandomCode = () => {
  const now = Date.now().toString();
  const availableChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789_ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let randomString = "";
  for (let i = 0; i < 18; i++) {
    randomString += availableChars[Math.floor(Math.random() * availableChars.length)];
  }
  for (let i = 0; i < 2; i++) {
    randomString = randomString.replace(
      randomString[Math.floor(Math.random() * randomString.length)],
      now.substring(now.length - i + 1),
    );
  }
  return randomString;
};

export const telegramCheckAuth = (authData: any) => {
  const { hash, ...data } = authData;

  // Check if auth_date is recent (within 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  const authTime = parseInt(data.auth_date, 10);
  const timeWindow = 5 * 60; // 5 minutes in seconds

  if (currentTime - authTime > timeWindow) {
    console.error("Telegram login attempt expired.");
    return false;
  }

  const secret = crypto.createHash("sha256").update(config.telegram.api_key).digest();
  const sortedKeys = Object.keys(data).sort();
  const dataCheckString = sortedKeys.map((key) => `${key}=${data[key]}`).join("\n");
  const hmac = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");

  return hmac === hash;
};

export const onDay = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export const diffDay = (date1: Date, date2: Date) => {
  date1.setHours(0, 0, 0);
  date2.setHours(0, 0, 0);

  const diffInMilliseconds = date1.getTime() - date2.getTime();

  return diffInMilliseconds / (1000 * 60 * 60 * 24);
};
