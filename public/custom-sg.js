const buttonElements = document.createElement("div");
const divAccessCode = document.createElement("div");
const logInBtn = document.createElement("button");
const infoText = document.createElement("pre");

infoText.style.margin = "auto";
infoText.style.textAlign = "left";
infoText.style.maxWidth = "60%";
infoText.style.wordBreak = "break-all";
infoText.style.whiteSpace = "pre-wrap";

let basePath = "";
setTimeout(() => {
  basePath = window.ui.getConfigs().spec.servers[0] ? window.ui.getConfigs().spec.servers[0].url : "";
}, 500);

logInBtn.innerText = "Log In With MetaMask";
logInBtn.style.fontWeight = "bold";
logInBtn.id = "log-in-btn";

logInBtn.style.padding = "10px";

divAccessCode.style.padding = "0 0 20px";
buttonElements.style.padding = "20px 0 0";
buttonElements.style.textAlign = "center";
logInBtn.style.marginRight = "20px";

buttonElements.appendChild(divAccessCode);
buttonElements.appendChild(logInBtn);
buttonElements.appendChild(infoText);

const checkExist = setInterval(function () {
  const swaggerUI = document.querySelector(".swagger-ui");
  if (swaggerUI !== null) {
    clearInterval(checkExist);

    // Add this method with your code
    const topBar = swaggerUI.querySelector(".topbar");

    topBar.insertAdjacentElement("afterend", buttonElements);
  }
}, 100); // check every 100ms

function setNativeValue(element, value) {
  let lastValue = element.value;
  element.value = value;
  let event = new Event("input", { target: element, bubbles: true });
  // React 15
  event.simulated = true;
  // React 16
  let tracker = element._valueTracker;
  if (tracker) {
    tracker.setValue(lastValue);
  }
  element.dispatchEvent(event);
}

(function (exports) {
  class WebAPI {
    async login(loginDto) {
      try {
        const response = await fetch(basePath + "/auth/login", {
          method: "POST",
          body: JSON.stringify(loginDto),
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        return data;
      } catch (error) {
        console.error(error, "login error");
      }
    }

    async getNonce(address) {
      try {
        const response = await fetch(basePath + `/auth/get-nonce/${address}`, {});
        const data = await response.json();
        return data;
      } catch (error) {
        console.error(error, "get nonce error");
      }
    }

    async refreshToken(refreshToken) {
      const response = await fetch(basePath + "/auth/refresh-token", {
        method: "POST",
        body: JSON.stringify({
          refreshToken: refreshToken,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      return data;
    }
  }

  class EtherumWallet {
    async getAccount() {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        return accounts[0];
      } catch (error) {
        if (error.code === 4001) {
          // EIP-1193 userRejectedRequest error
          // If this happens, the user rejected the connection request.
          console.log("Please connect to MetaMask.");
        } else {
          console.error(error, "Error get metamask account");
        }
      }
    }

    async signatureMessage(publicAddress, msg) {
      try {
        return await window.ethereum.request({
          method: "personal_sign",
          params: [msg, publicAddress, ""],
        });
      } catch (error) {
        console.error(error, "Error personal sign signature");
      }
    }
  }

  class ManageCookie {
    setCookie(name, value, moreOptions) {
      const options = {
        path: "/",
        // add other defaults here if necessary
        secure: true,
        ...moreOptions,
      };

      if (options.expires instanceof Date) {
        options.expires = options.expires.toUTCString();
      }

      let updatedCookie = encodeURIComponent(name) + "=" + encodeURIComponent(value);

      for (const optionKey in options) {
        updatedCookie += "; " + optionKey;
        const optionValue = options[optionKey];

        if (optionValue !== true) {
          updatedCookie += "=" + optionValue;
        }
      }

      document.cookie = updatedCookie;
    }

    deleteCookie(name) {
      this.setCookie(name, "", {
        "max-age": -1,
      });
    }

    saveToLoginSessionToBrowser(responseLogin) {
      this.setCookie("access_token", responseLogin.accessToken.token, {
        expires: responseLogin.accessToken.expires,
        sameSite: "Lax",
      });
      this.setCookie("refresh_token", responseLogin.refreshToken.token, {
        expires: responseLogin.refreshToken.expires,
        sameSite: "Lax",
      });
    }

    getCookie(name) {
      const matches = document.cookie.match(
        new RegExp("(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1") + "=([^;]*)"),
      );
      return matches ? decodeURIComponent(matches[1]) : undefined;
    }
  }

  const webAPI = new WebAPI();
  const etherumWallet = new EtherumWallet();
  const manageCookie = new ManageCookie();
  // const connectButton = document.querySelector("#connectButton");
  // const logoutButton = document.querySelector("#logoutButton");
  let currentWalletAddress = null;

  if (logInBtn) {
    logInBtn.addEventListener("click", () => {
      connect();
    });
  }

  function askToInstallMetaMask() {
    const answer = window.confirm("MetaMask isn't installed 👀 \n \nDownload now and try connect again?");

    if (answer === true) {
      window.open("https://metamask.io/download", "_blank");
    }
  }

  async function connect() {
    if (typeof window.ethereum !== "undefined") {
      const message = "I am signing my one-time nonce: ";
      currentWalletAddress = await etherumWallet.getAccount();
      const responseNonce = await webAPI.getNonce(currentWalletAddress);
      const signature = await etherumWallet.signatureMessage(responseNonce.address, message + responseNonce.nonce);
      const responseSign = {
        network: responseNonce.address.startsWith("0x") ? "eth" : "solana",
        address: responseNonce.address,
        message,
        signature,
      };

      infoText.innerHTML = JSON.stringify(responseSign, undefined, 2);
      const loginRes = await webAPI.login(responseSign);
      infoText.innerHTML = JSON.stringify(
        {
          ...responseSign,
          ...loginRes?.tokens,
        },
        undefined,
        2,
      );
      document.querySelector(".auth-wrapper .btn.authorize.locked")?.click();
      document.querySelector(".auth-container .btn.modal-btn.auth.button")?.click();
      document.querySelector(".auth-container .btn.modal-btn.auth.btn-done.button")?.click();
      document.querySelector(".auth-wrapper .btn.authorize.unlocked").click();
      var input = document.querySelector(".auth-container input[aria-label='auth-bearer-value']");
      setNativeValue(input, loginRes?.tokens?.access?.token);

      document.querySelector(".auth-container .btn.modal-btn.auth.authorize.button").click();
      document.querySelector(".auth-container .btn.modal-btn.auth.btn-done.button").click();
    } else {
      askToInstallMetaMask();
    }
  }

  async function updateCookieWhenAccessTokenExpire() {
    const accessToken = manageCookie.getCookie("access_token");
    const refreshToken = manageCookie.getCookie("refresh_token");

    if (!accessToken && refreshToken) {
      // call api refresh
      const responseRefreshToken = await webAPI.refreshToken(refreshToken);
      manageCookie.saveToLoginSessionToBrowser(responseRefreshToken);
    }
  }
  function getTokensFromCookie() {
    const accessToken = manageCookie.getCookie("access_token");
    const refreshToken = manageCookie.getCookie("refresh_token");
    const result = {
      accessToken,
      refreshToken,
    };
    return JSON.stringify(result);
  }
  function getAccessToken() {
    return manageCookie.getCookie("access_token");
  }
  function getRefreshToken() {
    return manageCookie.getCookie("refresh_token");
  }

  function disconnectAccount() {
    console.log("disconneted");
    manageCookie.deleteCookie("access_token");
    manageCookie.deleteCookie("refresh_token");
    const accessToken = manageCookie.getCookie("access_token");
    const refreshToken = manageCookie.getCookie("refresh_token");

    if (accessToken) {
      manageCookie.deleteCookie("access_token");
    }

    if (refreshToken) {
      manageCookie.deleteCookie("refresh_token");
    }

    currentWalletAddress = null;
  }

  window.ethereum.on("accountsChanged", (accounts) => {
    // If user has locked/logout from MetaMask, this resets the accounts array to empty
    if (!accounts.length) {
      // logic to handle what happens once MetaMask is locked
      disconnectAccount();
      window.alert("Disconnected from Metamask\n\nPlease reload and try again 👍");
      window.location.reload();
    } else if (accounts[0] !== currentWalletAddress) {
      currentWalletAddress = accounts[0]; // Do any other work!
    }
  }); // ethereum.removeListener("accountsChanged", handleAccountsChanged)

  window.ethereum.on("chainChanged", () => window.location.reload());

  exports.getAccessToken = getAccessToken;
  exports.getRefreshToken = getRefreshToken;
  exports.getTokensFromCookie = getTokensFromCookie;
  exports.updateCookieWhenAccessTokenExpire = updateCookieWhenAccessTokenExpire;

  Object.defineProperty(exports, "__esModule", { value: true });

  return exports;
})({});
