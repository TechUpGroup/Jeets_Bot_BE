import BigNumber from "bignumber.js";
import { TAB } from "common/enums/common";
import ShortUniqueId from "short-unique-id";

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

export const getStartTime = (tab: TAB) => {
  const timestamp = new Date();
  if (tab === TAB.DAILY) {
    timestamp.setHours(0, 0, 0, 0);
    return timestamp;
  }
  if (tab === TAB.WEEKLY) {
    const day = timestamp.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    timestamp.setDate(timestamp.getDate() + diff);
    timestamp.setHours(0, 0, 0, 0);
    return timestamp;
  }
  if (tab === TAB.MONTH) {
    timestamp.setDate(1);
    timestamp.setHours(0, 0, 0, 0);
    return timestamp;
  }
  return timestamp;
};

// export const getMilestoneAirdropMarketCap = (usdMarketCap: number, currentMarketCapMilestone: number) => {
//   for (const key of Object.keys(MARKET_CAP_AIRDROP).reverse()) {
//     if (BigNumber(usdMarketCap).gte(key) && BigNumber(key).gt(currentMarketCapMilestone)) {
//       return +key
//     }
//   }
//   return currentMarketCapMilestone
// };

// export const getMilestoneAirdropDailyVolume = (usdSolAmount: number, currentDailyVolumeMilestone: number) => {
//   for (const key of Object.keys(DAILY_VOLUME_AIRDROP).reverse()) {
//     if (BigNumber(usdSolAmount).gte(key) && BigNumber(key).gt(currentDailyVolumeMilestone)) {
//       return +key
//     }
//   }
//   return currentDailyVolumeMilestone
// };

// export const getRewardAirdropMarketCap = (marketCapAirdropProcessing: number, currentMarketCapMilestone: number) => {
//   let total = 0;
//   for (const [key, value] of Object.entries(MARKET_CAP_AIRDROP)) {
//     if (BigNumber(key).gt(marketCapAirdropProcessing) && BigNumber(key).lte(currentMarketCapMilestone)) {
//       total = total + value;
//     }
//   }
//   return total;
// };

// export const getRewardAirdropDailyVolume = (dailyVolumeAirdropProcessing: number, currentDailyVolumeMilestone: number) => {
//   let total = 0;
//   for (const [key, value] of Object.entries(DAILY_VOLUME_AIRDROP)) {
//     if (BigNumber(key).gt(dailyVolumeAirdropProcessing) && BigNumber(key).lte(currentDailyVolumeMilestone)) {
//       total = total + value;
//     }
//   }
//   return total;
// };
