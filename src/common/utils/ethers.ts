import { defaultAbiCoder, ParamType } from "@ethersproject/abi";
import { getAddress } from "@ethersproject/address";
import { arrayify, hexDataSlice } from "@ethersproject/bytes";
import { AddressZero } from "@ethersproject/constants";
import { Contract, ContractFactory } from "@ethersproject/contracts";
import { keccak256 as keccak256Base } from "@ethersproject/keccak256";
import { Web3Provider } from "@ethersproject/providers";
import { pack } from "@ethersproject/solidity";
import { toUtf8Bytes } from "@ethersproject/strings";
import { Wallet } from "@ethersproject/wallet";

import type { Signer } from "@ethersproject/abstract-signer";
import type { Provider } from "@ethersproject/providers";
import { TOTAL_SUPPLY } from "common/constants/asset";

export const bytecode =
  "0x60806040523480156200001157600080fd5b5060405162000fd838038062000fd8833981016040819052620000349162000349565b338385600362000045838262000463565b50600462000054828262000463565b5050506001600160a01b0381166200008757604051631e4fbdf760e01b8152600060048201526024015b60405180910390fd5b6200009281620000c1565b506005805460ff60a01b1916600160a01b60ff851602179055620000b7338262000113565b5050505062000557565b600580546001600160a01b038381166001600160a01b0319831681179093556040519116919082907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b6001600160a01b0382166200013f5760405163ec442f0560e01b8152600060048201526024016200007e565b6200014d6000838362000151565b5050565b6001600160a01b038316620001805780600260008282546200017491906200052f565b90915550620001f49050565b6001600160a01b03831660009081526020819052604090205481811015620001d55760405163391434e360e21b81526001600160a01b038516600482015260248101829052604481018390526064016200007e565b6001600160a01b03841660009081526020819052604090209082900390555b6001600160a01b038216620002125760028054829003905562000231565b6001600160a01b03821660009081526020819052604090208054820190555b816001600160a01b0316836001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040516200027791815260200190565b60405180910390a3505050565b634e487b7160e01b600052604160045260246000fd5b600082601f830112620002ac57600080fd5b81516001600160401b0380821115620002c957620002c962000284565b604051601f8301601f19908116603f01168101908282118183101715620002f457620002f462000284565b816040528381526020925086838588010111156200031157600080fd5b600091505b8382101562000335578582018301518183018401529082019062000316565b600093810190920192909252949350505050565b600080600080608085870312156200036057600080fd5b84516001600160401b03808211156200037857600080fd5b62000386888389016200029a565b955060208701519150808211156200039d57600080fd5b50620003ac878288016200029a565b935050604085015160ff81168114620003c457600080fd5b6060959095015193969295505050565b600181811c90821680620003e957607f821691505b6020821081036200040a57634e487b7160e01b600052602260045260246000fd5b50919050565b601f8211156200045e57600081815260208120601f850160051c81016020861015620004395750805b601f850160051c820191505b818110156200045a5782815560010162000445565b5050505b505050565b81516001600160401b038111156200047f576200047f62000284565b6200049781620004908454620003d4565b8462000410565b602080601f831160018114620004cf5760008415620004b65750858301515b600019600386901b1c1916600185901b1785556200045a565b600085815260208120601f198616915b828110156200050057888601518255948401946001909101908401620004df565b50858210156200051f5787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b808201808211156200055157634e487b7160e01b600052601160045260246000fd5b92915050565b610a7180620005676000396000f3fe608060405234801561001057600080fd5b50600436106100ea5760003560e01c8063715018a61161008c57806395d89b411161006657806395d89b41146101de578063a9059cbb146101e6578063dd62ed3e146101f9578063f2fde38b1461023257600080fd5b8063715018a6146101a75780638091f3bf146101af5780638da5cb5b146101c357600080fd5b806318160ddd116100c857806318160ddd1461013a57806323b872dd1461014c578063313ce5671461015f57806370a082311461017e57600080fd5b806301339c21146100ef57806306fdde03146100f9578063095ea7b314610117575b600080fd5b6100f7610245565b005b6101016102c1565b60405161010e91906108c2565b60405180910390f35b61012a61012536600461092c565b610353565b604051901515815260200161010e565b6002545b60405190815260200161010e565b61012a61015a366004610956565b61036d565b600554600160a01b900460ff1660405160ff909116815260200161010e565b61013e61018c366004610992565b6001600160a01b031660009081526020819052604090205490565b6100f76103da565b60055461012a90600160a81b900460ff1681565b6005546040516001600160a01b03909116815260200161010e565b6101016103ee565b61012a6101f436600461092c565b6103fd565b61013e6102073660046109ad565b6001600160a01b03918216600090815260016020908152604080832093909416825291909152205490565b6100f7610240366004610992565b61040b565b61024d610449565b600554600160a81b900460ff16156102ac5760405162461bcd60e51b815260206004820152601960248201527f636f6e747261637420616c7265616479206c61756e636865640000000000000060448201526064015b60405180910390fd5b6005805460ff60a81b1916600160a81b179055565b6060600380546102d0906109e0565b80601f01602080910402602001604051908101604052809291908181526020018280546102fc906109e0565b80156103495780601f1061031e57610100808354040283529160200191610349565b820191906000526020600020905b81548152906001019060200180831161032c57829003601f168201915b5050505050905090565b600033610361818585610476565b60019150505b92915050565b600554600090600160a81b900460ff1615801561039757506005546001600160a01b038481169116145b80156103ad57506005546001600160a01b031633145b156103c5576103bd848484610488565b5060016103d3565b6103d08484846104e9565b90505b9392505050565b6103e2610449565b6103ec600061050d565b565b6060600480546102d0906109e0565b600033610361818585610488565b610413610449565b6001600160a01b03811661043d57604051631e4fbdf760e01b8152600060048201526024016102a3565b6104468161050d565b50565b6005546001600160a01b031633146103ec5760405163118cdaa760e01b81523360048201526024016102a3565b610483838383600161055f565b505050565b6104928383610635565b6104de5760405162461bcd60e51b815260206004820152601b60248201527f5468697320746f6b656e206973206e6f74206c61756e636865642e000000000060448201526064016102a3565b6104838383836106c1565b6000336104f7858285610720565b610502858585610488565b506001949350505050565b600580546001600160a01b038381166001600160a01b0319831681179093556040519116919082907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b6001600160a01b0384166105895760405163e602df0560e01b8152600060048201526024016102a3565b6001600160a01b0383166105b357604051634a1406b160e11b8152600060048201526024016102a3565b6001600160a01b038085166000908152600160209081526040808320938716835292905220829055801561062f57826001600160a01b0316846001600160a01b03167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9258460405161062691815260200190565b60405180910390a35b50505050565b600554600090600160a81b900460ff161561065257506001610367565b6005546001600160a01b038481169116148061067b57506005546001600160a01b038381169116145b1561068857506001610367565b6000836001600160a01b03163b11806106ab57506000826001600160a01b03163b115b156106b857506000610367565b50600192915050565b6001600160a01b0383166106eb57604051634b637e8f60e11b8152600060048201526024016102a3565b6001600160a01b0382166107155760405163ec442f0560e01b8152600060048201526024016102a3565b610483838383610798565b6001600160a01b03838116600090815260016020908152604080832093861683529290522054600019811461062f578181101561078957604051637dc7a0d960e11b81526001600160a01b038416600482015260248101829052604481018390526064016102a3565b61062f8484848403600061055f565b6001600160a01b0383166107c35780600260008282546107b89190610a1a565b909155506108359050565b6001600160a01b038316600090815260208190526040902054818110156108165760405163391434e360e21b81526001600160a01b038516600482015260248101829052604481018390526064016102a3565b6001600160a01b03841660009081526020819052604090209082900390555b6001600160a01b03821661085157600280548290039055610870565b6001600160a01b03821660009081526020819052604090208054820190555b816001600160a01b0316836001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040516108b591815260200190565b60405180910390a3505050565b600060208083528351808285015260005b818110156108ef578581018301518582016040015282016108d3565b506000604082860101526040601f19601f8301168501019250505092915050565b80356001600160a01b038116811461092757600080fd5b919050565b6000806040838503121561093f57600080fd5b61094883610910565b946020939093013593505050565b60008060006060848603121561096b57600080fd5b61097484610910565b925061098260208501610910565b9150604084013590509250925092565b6000602082840312156109a457600080fd5b6103d382610910565b600080604083850312156109c057600080fd5b6109c983610910565b91506109d760208401610910565b90509250929050565b600181811c908216806109f457607f821691505b602082108103610a1457634e487b7160e01b600052602260045260246000fd5b50919050565b8082018082111561036757634e487b7160e01b600052601160045260246000fdfea26469706673582212204680f425c78fbe2eb6303a84e736c57f6cffcb54558102ee86706fabe1007e8464736f6c63430008140033";

export const getLibrary = (provider: any) => {
  return new Web3Provider(provider);
};

// returns the checksummed address if the address is valid, otherwise returns false
function isAddress(value: any) {
  try {
    return getAddress(value);
  } catch {
    return false;
  }
}

export function getWallet(privateKey: string, provider: Provider) {
  return new Wallet(privateKey, provider);
}

export function getContractFactory(abi: any, bytecode: any, signer?: Signer) {
  return new ContractFactory(abi, bytecode, signer);
}

export function getContract<T extends Contract = Contract>(address: string, ABI: any, signer: Provider | Signer) {
  if (!isAddress(address) || address === AddressZero) {
    throw Error(`Invalid 'address' parameter '${address}'.`);
  }
  return new Contract(address, ABI, signer) as T;
}

export const signMessage = async (signer: Signer, message: string): Promise<string> => {
  return signer.signMessage(message);
};

export const keccak256 = (message: string) => keccak256Base(toUtf8Bytes(message));

export const encodeParameters = (types: ReadonlyArray<string | ParamType>, values: ReadonlyArray<any>) => {
  return defaultAbiCoder.encode(types, values);
};

export const encodePacked = (types: string[], values: any[]) => {
  return pack(types, values);
};

export const generateParamsSign = (params: string[], values: any[]) => {
  const encodedMessage = encodeParameters(params, values);
  const hashMessage = keccak256Base(encodedMessage);
  return arrayify(hashMessage);
};

export const generateNonce = (address: string) => {
  const now = new Date().getTime();
  return keccak256(address.slice(2) + now.toString());
};

export const generateRandomString = (length: number) => {
  const availableChars = "0123456789012345678901234567890123456789012345678901234567890123456789";
  let randomString = "";
  for (let i = 0; i < length; i++) {
    randomString += availableChars[Math.floor(Math.random() * availableChars.length)];
  }
  return randomString;
};

export const generateRandom = () => {
  const randomCode = generateRandomString(75);
  return Math.floor(Math.random() * 10).toFixed() + randomCode;
};

export const calculateContractAddress = (
  address: string,
  nonce: string,
  symbol: string,
  name: string,
  decimal: number,
) => {
  const encodedParams = encodeParameters(
    ["string", "string", "uint8", "uint256"],
    [symbol, name, decimal, TOTAL_SUPPLY],
  );

  const encodedHash = encodePacked(["bytes", "bytes"], [bytecode, encodedParams]);

  const creationCodeHash = keccak256Base(encodedHash);

  const addressBytes = keccak256Base(
    encodePacked(["bytes1", "address", "bytes32", "bytes32"], ["0xff", address, nonce, creationCodeHash]),
  );

  return getAddress(hexDataSlice(addressBytes, 12));
};