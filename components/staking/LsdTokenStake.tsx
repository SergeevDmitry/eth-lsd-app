import classNames from "classnames";
import { Icomoon } from "components/icon/Icomoon";
import { getEthereumChainId, getEthereumChainName } from "config/env";
import { useAppDispatch, useAppSelector } from "hooks/common";
import { useAppSlice } from "hooks/selector";
import { useApr } from "hooks/useApr";
import { useBalance } from "hooks/useBalance";
import { useGasPrice } from "hooks/useGasPrice";
import { useLsdEthRate } from "hooks/useLsdEthRate";
import { useMinimumStakeLimit } from "hooks/useMinimumStakeLimit";
import { usePrice } from "hooks/usePrice";
import { useWalletAccount } from "hooks/useWalletAccount";
import { bindPopover } from "material-ui-popup-state";
import HoverPopover from "material-ui-popup-state/HoverPopover";
import { bindHover, usePopupState } from "material-ui-popup-state/hooks";
import Image from "next/image";
import { useMemo, useState } from "react";
import { handleEthStake, updateEthBalance } from "redux/reducers/EthSlice";
import { updateLsdEthBalance } from "redux/reducers/LsdEthSlice";
import { RootState } from "redux/store";
import { getLsdEthName, getTokenName } from "utils/configUtils";
import { getTokenIcon } from "utils/iconUtils";
import { formatLargeAmount, formatNumber } from "utils/numberUtils";
import { useConnect, useSwitchNetwork } from "wagmi";
import Web3 from "web3";
import { CustomButton } from "../common/CustomButton";
import { CustomNumberInput } from "../common/CustomNumberInput";
import { DataLoading } from "../common/DataLoading";
import { useDepositEnabled } from "hooks/useDepositEnabled";
import { setMetaMaskDisconnected } from "redux/reducers/WalletSlice";

export const LsdTokenStake = () => {
  const dispatch = useAppDispatch();
  const { switchNetworkAsync } = useSwitchNetwork();
  const { connectAsync, connectors } = useConnect();
  const { darkMode } = useAppSlice();
  const { ethPrice } = usePrice();
  const { gasPrice } = useGasPrice();
  const lsdEthRate = useLsdEthRate();

  const { lsdBalance } = useBalance();
  const { apr } = useApr();
  const [stakeAmount, setStakeAmount] = useState("");
  const { metaMaskChainId, metaMaskAccount } = useWalletAccount();

  const { minimumDeposit: ethMinimumDeposit } = useMinimumStakeLimit();
  const { depositEnabled } = useDepositEnabled();

  const { balance } = useBalance();

  const stakeLoading = useAppSelector((state: RootState) => state.app.stakeLoading);

  const walletNotConnected = useMemo(() => {
    return !metaMaskAccount;
  }, [metaMaskAccount]);

  const isWrongMetaMaskNetwork = useMemo(() => {
    return Number(metaMaskChainId) !== getEthereumChainId();
  }, [metaMaskChainId]);

  const stakeValue = useMemo(() => {
    if (!stakeAmount || isNaN(Number(stakeAmount)) || Number(stakeAmount) === 0 || isNaN(Number(ethPrice))) {
      return undefined;
    }
    return Number(stakeAmount) * Number(ethPrice);
  }, [stakeAmount, ethPrice]);

  const willReceiveAmount = useMemo(() => {
    if (isNaN(Number(stakeAmount)) || isNaN(Number(lsdEthRate)) || Number(stakeAmount) === 0) {
      return "--";
    }
    return Number(stakeAmount) / Number(lsdEthRate) + "";
  }, [stakeAmount, lsdEthRate]);

  const estimateFee = useMemo(() => {
    let gasLimit = 146316;

    if (isNaN(gasPrice)) {
      return "--";
    }

    return Web3.utils.fromWei(Web3.utils.toBN(gasLimit).mul(Web3.utils.toBN(gasPrice)));
  }, [gasPrice]);

  const transactionCost = useMemo(() => {
    if (isNaN(Number(estimateFee))) {
      return "--";
    }
    return Number(estimateFee) + "";
  }, [estimateFee]);

  const transactionCostValue = useMemo(() => {
    if (isNaN(Number(transactionCost)) || isNaN(Number(ethPrice))) {
      return "--";
    }
    return Number(transactionCost) * Number(ethPrice) + "";
  }, [transactionCost, ethPrice]);

  const [buttonDisabled, buttonText] = useMemo(() => {
    if (!depositEnabled) {
      return [true, "Stake is paused"];
    }
    if (walletNotConnected) {
      return [false, "Connect Wallet"];
    }
    if (isWrongMetaMaskNetwork) {
      return [false, `Switch Network`];
    }
    if (!stakeAmount || isNaN(Number(stakeAmount)) || Number(stakeAmount) === 0 || isNaN(Number(balance))) {
      return [true, "Stake"];
    }

    if (Number(stakeAmount) < Number(ethMinimumDeposit)) {
      return [true, `Minimal Stake Amount is ${ethMinimumDeposit} ${getTokenName()}`];
    }

    if (Number(stakeAmount) + (isNaN(Number(estimateFee)) ? 0 : Number(estimateFee) * 1.4) > Number(balance)) {
      return [true, `Not Enough ${getTokenName()} to Stake`];
    }

    return [false, "Stake"];
  }, [
    isWrongMetaMaskNetwork,
    balance,
    stakeAmount,
    walletNotConnected,
    estimateFee,
    ethMinimumDeposit,
    depositEnabled,
  ]);

  const newRTokenBalance = useMemo(() => {
    if (isNaN(Number(lsdBalance))) {
      return "--";
    }

    if (isNaN(Number(stakeAmount)) || isNaN(Number(lsdEthRate))) {
      return "--";
    }
    return Number(lsdBalance) + Number(stakeAmount) / Number(lsdEthRate) + "";
  }, [lsdBalance, lsdEthRate, stakeAmount]);

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
    if (isWrongMetaMaskNetwork || walletNotConnected || isNaN(Number(balance))) {
      return;
    }
    let amount = Number(balance);
    if (isNaN(Number(estimateFee))) return;
    amount = Math.max(Number(balance) - Number(estimateFee) * 1.5, 0);

    if (Number(amount) > 0) {
      setStakeAmount(
        formatNumber(amount.toString(), {
          toReadable: false,
          withSplit: false,
        })
      );
    }
  };

  const clickStake = () => {
    // Connect Wallet
    if (walletNotConnected || isWrongMetaMaskNetwork) {
      clickConnectWallet();
      return;
    }

    dispatch(
      handleEthStake(Number(stakeAmount) + "", willReceiveAmount, newRTokenBalance, false, (success) => {
        dispatch(updateEthBalance());
        if (success) {
          setStakeAmount("");
          dispatch(updateLsdEthBalance());
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
      <div className="h-[1.07rem] mt-[.18rem] pt-[.24rem] mx-[.2rem] bg-color-bgPage rounded-[.1rem] border border-white/5">
        <div className="mx-[.12rem] flex items-start">
          <div className="h-[.42rem] bg-bg2 rounded-[.3rem] flex items-center cursor-pointer max-[560px]:hidden">
            <div className="ml-[.08rem] flex items-center">
              <div className="w-[.34rem] h-[.34rem] relative">
                <Image src={getTokenIcon()} alt="logo" layout="fill" />
              </div>

              <div className=" text-text1Dark text-[.16rem] ml-[.16rem]">{getTokenName()}</div>
            </div>

            <div className="ml-[.16rem] mr-[.16rem]">
              {/* <Icomoon icon="arrow-down" size=".1rem" color="#848B97" /> */}
            </div>
          </div>

          <div className="flex-1 flex justify-start flex-col pl-[.14rem]">
            <div className="flex items-center h-[.42rem]">
              <CustomNumberInput
                value={stakeAmount}
                handleValueChange={setStakeAmount}
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
                {stakeValue ? `$${formatNumber(stakeValue, { decimals: 2 })}` : ""}{" "}
              </div>

              <div className="flex items-center">
                <div className="text-color-text2">Balance</div>
                <div className="ml-[.06rem] text-color-text1">{formatNumber(balance)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <CustomButton
        loading={stakeLoading}
        disabled={buttonDisabled}
        mt=".18rem"
        className="mx-[.2rem]"
        height=".56rem"
        type={"primary"}
        onClick={clickStake}
        border="none"
      >
        <div className="flex items-center">
          {buttonText}

          {/* {(buttonText.indexOf("Wrong network") >= 0 || buttonText.indexOf("Insufficient FIS.") >= 0) && (
            <div className="ml-[.12rem] flex items-center">
              <Icomoon icon="arrow-right" size=".12rem" color="#fff" />
            </div>
          )} */}
        </div>
      </CustomButton>
      <div
        className="mx-[.75rem] my-[.24rem] grid items-stretch font-[500] max-[560px]:mx-[.1rem]"
        style={{ gridTemplateColumns: "40% 30% 30%" }}
      >
        <div className="flex justify-start">
          <div className="flex flex-col items-center">
            <div className="text-text2/50 dark:text-text2Dark/50 text-[.14rem]">Will Receive</div>
            <div className="mt-[.1rem] flex items-center">
              <div className="text-color-text2 text-[.16rem] text-center" {...bindHover(ratePopupState)}>
                {formatLargeAmount(willReceiveAmount)} {getLsdEthName()}
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
                <DataLoading height=".16rem" />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end mr-[.0rem]">
          <div className="flex flex-col items-center">
            <div className="text-text2/50 dark:text-text2Dark/50 text-[.14rem]">Est. Cost</div>

            <div className="mt-[.1rem] text-color-text2 text-[.16rem]">
              ${formatNumber(transactionCostValue, { decimals: 2 })}
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
