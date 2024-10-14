export interface IAttribute {
  trait_type: string;
  value: string;
}

export interface IRollResult {
  numResource: number; // 1, 2, ... số lần hiện shop; 20 = 1 shop hiện 20 resource, 30 = 1 shop hiện 30 resource
  numItem: number; // 1, 2, ... số lần xuất hiện shop
  shop2Resource: number; // 0 = ko shop nào, 1 shop đầu có 2 resource
  must: number; // 0 = tự do, 1 = phải chọn 1 resource, 2 = phải skip resource
  option: number; //option = 0: bình thường, option = 1: uncommon - rare - very rare, 2: rare - verry rare, 3: veryRare 
  ratio: any; // x ratio
}
