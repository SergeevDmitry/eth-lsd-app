import classNames from "classnames";
import { Icomoon } from "components/icon/Icomoon";
import { getEthereumChainId, getEthereumChainName } from "config/env";
import { useAppDispatch, useAppSelector } from "hooks/common";
import { useAppSlice } from "hooks/selector";
import { useApr } from "hooks/useApr";
import { useBalance } from "hooks/useBalance";
import { useGasPrice } from "hooks/useGasPrice";
import { useLsdEthRate } from "hooks/useLsdEthRate";
import { usePrice } from "hooks/usePrice";
import { useWalletAccount } from "hooks/useWalletAccount";
import { bindHover, bindPopover } from "material-ui-popup-state";
import HoverPopover from "material-ui-popup-state/HoverPopover";
import { usePopupState } from "material-ui-popup-state/hooks";
import Image from "next/image";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { handleLsdEthUnstake } from "redux/reducers/EthSlice";
import { updateLsdEthBalance } from "redux/reducers/LsdEthSlice";
import { setMetaMaskDisconnected } from "redux/reducers/WalletSlice";
import { RootState } from "redux/store";
import { openLink } from "utils/commonUtils";
import { getLsdEthName, getTokenName, getUnstakeDuration, getUnstakeTipLink } from "utils/configUtils";
import { formatLargeAmount, formatNumber } from "utils/numberUtils";
import { useConnect, useSwitchNetwork } from "wagmi";
import Web3 from "web3";
import { CustomButton } from "../common/CustomButton";
import { CustomNumberInput } from "../common/CustomNumberInput";
import { DataLoading } from "../common/DataLoading";
import { getLsdTokenIcon } from "utils/iconUtils";

export const LsdTokenUnstake = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { darkMode } = useAppSlice();
  const { switchNetworkAsync } = useSwitchNetwork();
  const { connectAsync, connectors } = useConnect();

  const { metaMaskAccount, metaMaskChainId } = useWalletAccount();
  const { balance } = useBalance();
  const { ethPrice, lsdEthPrice } = usePrice();
  const { gasPrice } = useGasPrice();

  const lsdEthRate = useLsdEthRate();

  const { lsdBalance } = useBalance();

  const { apr } = useApr();

  const [unstakeAmount, setUnstakeAmount] = useState("");

  const unstakeLoading = useAppSelector((state: RootState) => state.app.unstakeLoading);

  const walletNotConnected = useMemo(() => {
    return !metaMaskAccount;
  }, [metaMaskAccount]);

  const availableBalance = useMemo(() => {
    if (walletNotConnected) {
      return "--";
    }
    return lsdBalance;
  }, [lsdBalance, walletNotConnected]);

  const isWrongMetaMaskNetwork = useMemo(() => {
    return Number(metaMaskChainId) !== getEthereumChainId();
  }, [metaMaskChainId]);

  const unstakeValue = useMemo(() => {
    if (!unstakeAmount || isNaN(Number(unstakeAmount)) || Number(unstakeAmount) === 0 || isNaN(Number(lsdEthPrice))) {
      return undefined;
    }
    return Number(unstakeAmount) * Number(lsdEthPrice);
  }, [unstakeAmount, lsdEthPrice]);

  const estimateFee = useMemo(() => {
    let gasLimit = 261659;
    if (isNaN(Number(gasPrice))) {
      return "--";
    }

    return Web3.utils.fromWei(
      Web3.utils
        .toBN(gasLimit)
        .mul(Web3.utils.toBN(Number(gasPrice)))
        .toString()
    );
  }, [gasPrice]);

  const redeemFee = useMemo(() => {
    return "0";
  }, []);

  const willReceiveAmount = useMemo(() => {
    if (isNaN(Number(unstakeAmount)) || isNaN(Number(lsdEthRate)) || Number(unstakeAmount) === 0) {
      return "--";
    }
    return Number(unstakeAmount) * Number(lsdEthRate) - Number(redeemFee) + "";
  }, [unstakeAmount, lsdEthRate, redeemFee]);

  const estimateCostValue = useMemo(() => {
    if (isNaN(Number(ethPrice)) || isNaN(Number(estimateFee))) {
      return "--";
    }
    return Number(ethPrice) * Number(estimateFee);
  }, [ethPrice, estimateFee]);

  const [buttonDisabled, buttonText, isButtonSecondary] = useMemo(() => {
    if (walletNotConnected) {
      return [false, "Connect Wallet"];
    }
    if (isWrongMetaMaskNetwork) {
      return [false, `Wrong network, click to change into ${getEthereumChainName()}`, true];
    }

    if (
      !unstakeAmount ||
      isNaN(Number(unstakeAmount)) ||
      Number(unstakeAmount) === 0 ||
      isNaN(Number(availableBalance))
    ) {
      return [true, "Unstake"];
    }

    if (Number(unstakeAmount) > Number(availableBalance)) {
      return [true, `Not Enough ${getLsdEthName()} to Unstake`];
    }

    if ((isNaN(Number(estimateFee)) ? 0 : Number(estimateFee) * 1.4) > Number(balance)) {
      return [true, `Not Enough ${getTokenName()} for Fee`];
    }

    return [false, "Unstake"];
  }, [isWrongMetaMaskNetwork, availableBalance, unstakeAmount, walletNotConnected, estimateFee, balance]);

  const newRTokenBalance = useMemo(() => {
    if (isNaN(Number(availableBalance))) {
      return "--";
    }
    if (isNaN(Number(unstakeAmount))) {
      return "--";
    }
    return Number(availableBalance) - Number(unstakeAmount) + "";
  }, [availableBalance, unstakeAmount]);

  const resetState = () => {
    setUnstakeAmount("");
  };

  const clickConnectWallet = async () => {
    if (isWrongMetaMaskNetwork) {
      await (switchNetworkAsync && switchNetworkAsync(getEthereumChainId()));
    } else {
      const metamaskConnector = connectors.find((c) => c.name === "MetaMask");
      if (!metamaskConnector) {
        return;
      }
      try {
        dispatch(setMetaMaskDisconnected(false));
        await connectAsync({
          chainId: getEthereumChainId(),
          connector: metamaskConnector,
        });
      } catch (err: any) {
        if (err.code === 4001) {
        } else {
          console.error(err);
        }
      }
    }
  };

  const clickMax = () => {
    if (isWrongMetaMaskNetwork || walletNotConnected || isNaN(Number(availableBalance))) {
      return;
    }
    setUnstakeAmount(
      formatNumber(availableBalance, {
        toReadable: false,
        withSplit: false,
      })
    );
  };

  const jumpToWithdraw = () => {
    router.replace({
      pathname: router.pathname,
      query: {
        ...router.query,
        tab: "withdraw",
      },
    });
  };

  const clickUnstake = () => {
    // Connect Wallet
    if (walletNotConnected || isWrongMetaMaskNetwork) {
      clickConnectWallet();
      return;
    }

    dispatch(
      handleLsdEthUnstake(unstakeAmount, willReceiveAmount, newRTokenBalance, false, (success, needWithdraw) => {
        dispatch(updateLsdEthBalance());
        if (success) {
          resetState();
          if (needWithdraw) {
            jumpToWithdraw();
          }
        }
      })
    );
  };

  const ratePopupState = usePopupState({
    variant: "popover",
    popupId: "rate",
  });

  return (
    <div>
      <div
        className="cursor-pointer py-[.16rem] mt-[.18rem] mx-[.24rem] bg-bg2 rounded-[.1rem] flex items-center justify-between pl-[.12rem] pr-[.18rem] gap-[.1rem]"
        onClick={() => {
          openLink(getUnstakeTipLink());
        }}
      >
        <div className="flex items-center">
          <Icomoon icon="tip" size=".2rem" color="#fff" />

          <div className="ml-[.06rem] text-color-text2 text-[.14rem] leading-tight">
            Unstaking may take around <span className="text-color-text1">{getUnstakeDuration()}</span>. After that,
            withdraw function will open
          </div>
        </div>

        <Icomoon icon="right" color="white" size=".11rem" />
      </div>

      <div className="h-[1.07rem] mt-[.18rem] pt-[.24rem] mx-[.2rem] bg-color-bgPage rounded-[.1rem] border border-white/5">
        <div className="mx-[.12rem] flex items-start">
          <div className="h-[.42rem] bg-bg2 rounded-[.3rem] flex items-center cursor-pointer  max-[560px]:hidden">
            <div className="ml-[.08rem] flex items-center">
              <div className="w-[.34rem] h-[.34rem] relative">
                <Image src={getLsdTokenIcon()} alt="logo" layout="fill" />
              </div>

              <div className=" text-text1Dark text-[.16rem] ml-[.16rem]">{getLsdEthName()}</div>
            </div>

            <div className="ml-[.16rem] mr-[.16rem]">
              {/* <Icomoon icon="arrow-down" size=".1rem" color="#848B97" /> */}
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-start pl-[.14rem]">
            <div className="flex items-center h-[.42rem]">
              <CustomNumberInput
                value={unstakeAmount}
                handleValueChange={setUnstakeAmount}
                fontSize=".24rem"
                placeholder="Amount"
              />
              <div>
                <CustomButton
                  type="stroke"
                  width=".63rem"
                  height=".36rem"
                  fontSize=".16rem"
                  className="bg-bg2"
                  onClick={clickMax}
                  border={`0.01rem solid ${"#fff4"}`}
                >
                  Max
                </CustomButton>
              </div>
            </div>

            <div className="mt-[.1rem] flex items-center justify-between text-[.14rem]">
              <div className="text-color-text2">
                {unstakeValue ? `$${formatNumber(unstakeValue, { decimals: 2 })}` : ""}{" "}
              </div>

              <div className="flex items-center">
                <div className="text-color-text2">Balance</div>
                <div className="ml-[.06rem] text-color-text1">{formatNumber(availableBalance)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CustomButton
        loading={unstakeLoading}
        disabled={buttonDisabled}
        mt=".18rem"
        className="mx-[.2rem]"
        height=".56rem"
        onClick={clickUnstake}
        type={isButtonSecondary ? "secondary" : "primary"}
        border="none"
      >
        <div className="flex items-center">
          {buttonText}

          {(buttonText.indexOf("Wrong network") >= 0 || buttonText.indexOf("Insufficient FIS.") >= 0) && (
            <div className="ml-[.12rem] flex items-center">
              <Icomoon icon="arrow-right" size=".12rem" color="#222C3C" />
            </div>
          )}
        </div>
      </CustomButton>

      <div
        className="mx-[.75rem] my-[.24rem] grid items-stretch font-[500] max-[560px]:mx-[.1rem]"
        style={{ gridTemplateColumns: "40% 30% 30%" }}
      >
        <div className="flex justify-start">
          <div className="flex flex-col items-center">
            <div className="text-text2/50 dark:text-text2Dark/50 text-[.14rem]">Will Receive</div>
            <div className="mt-[.1rem] flex items-center" {...bindHover(ratePopupState)}>
              <div className="text-color-text2 text-[.16rem] text-center">
                {formatLargeAmount(willReceiveAmount)} {getTokenName()}
              </div>
              <div
                className={classNames(
                  "ml-[.06rem] flex items-center relative self-center max-[560px]:hidden",
                  ratePopupState.isOpen ? "rotate-[270deg]" : "rotate-90"
                )}
              >
                <Icomoon icon="right" size=".12rem" color="#6c6f77" layout="fill" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-text2/50 dark:text-text2Dark/50 text-[.14rem]">APR</div>

          <div className="mt-[.1rem] flex items-center">
            {apr !== undefined ? (
              <div className="text-color-text2 text-[.16rem]">
                {formatNumber(apr, { decimals: 2, toReadable: false })}%
              </div>
            ) : (
              <div className="">
                <DataLoading height=".32rem" />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end mr-[.0rem]">
          <div className="flex flex-col items-center">
            <div className="text-text2/50 dark:text-text2Dark/50 text-[.14rem]">Est. Cost</div>

            <div className="mt-[.1rem] text-color-text2 text-[.16rem]">
              ${formatNumber(estimateCostValue, { decimals: 2 })}
            </div>
          </div>
        </div>
      </div>

      <HoverPopover
        {...bindPopover(ratePopupState)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        elevation={0}
        sx={{
          marginTop: ".15rem",
          "& .MuiPopover-paper": {
            background: "#101112",
            border: "1px solid #fff3",
            backdropFilter: "blur(.4rem)",
            borderRadius: ".1rem",
            filter: "drop-shadow(0px 0px 12px #0002)!important",
          },
          "& .MuiTypography-root": {
            padding: "0px",
          },
          "& .MuiBox-root": {
            padding: "0px",
          },
        }}
      >
        <div className={classNames("p-[.16rem] text-[.14rem] text-color-text2 flex flex-col justify-center")}>
          <div className="text-center leading-[150%]">Exchange Rate</div>
          <div className="text-center mt-[.08rem] leading-[150%]">1:{formatNumber(lsdEthRate, { decimals: 6 })}</div>
        </div>
      </HoverPopover>
    </div>
  );
};
