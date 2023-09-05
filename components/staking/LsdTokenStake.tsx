import { Icomoon } from "components/icon/Icomoon";
import { getEthereumChainId, getEthereumChainName } from "config/env";
import { useAppDispatch, useAppSelector } from "hooks/common";
import { usePrice } from "hooks/usePrice";
import { useLsdEthRate } from "hooks/useLsdEthRate";
import { useWalletAccount } from "hooks/useWalletAccount";
import Image from "next/image";
import { useMemo, useState } from "react";
import { handleEthStake, updateEthBalance } from "redux/reducers/EthSlice";
import { updateLsdEthBalance } from "redux/reducers/LsdEthSlice";
import { connectMetaMask } from "redux/reducers/WalletSlice";
import { RootState } from "redux/store";
import { formatLargeAmount, formatNumber } from "utils/numberUtils";
import Web3 from "web3";
import { CustomButton } from "../common/CustomButton";
import { CustomNumberInput } from "../common/CustomNumberInput";
import { DataLoading } from "../common/DataLoading";
import { getTokenIcon } from "utils/iconUtils";
import { useBalance } from "hooks/useBalance";
import { getLsdEthName, getTokenName } from "utils/configUtils";
import { useMinimumStakeLimit } from "hooks/useMinimumStakeLimit";
import { useApr } from "hooks/useApr";
import { useAppSlice } from "hooks/selector";

export const LsdTokenStake = () => {
  const dispatch = useAppDispatch();
  const { darkMode } = useAppSlice();
  const { gasPrice, ethPrice } = usePrice();
  const lsdEthRate = useLsdEthRate();

  const { lsdBalance } = useBalance();
  const { apr } = useApr();
  const [stakeAmount, setStakeAmount] = useState("");
  const { metaMaskChainId, metaMaskAccount } = useWalletAccount();

  const { minimumDeposit: ethMinimumDeposit } = useMinimumStakeLimit();

  const { balance } = useBalance();

  const { stakeLoading } = useAppSelector((state: RootState) => {
    return {
      stakeLoading: state.app.stakeLoading,
    };
  });

  const walletNotConnected = useMemo(() => {
    return !metaMaskAccount;
  }, [metaMaskAccount]);

  const isWrongMetaMaskNetwork = useMemo(() => {
    return Number(metaMaskChainId) !== getEthereumChainId();
  }, [metaMaskChainId]);

  const stakeValue = useMemo(() => {
    if (
      !stakeAmount ||
      isNaN(Number(stakeAmount)) ||
      Number(stakeAmount) === 0 ||
      isNaN(Number(ethPrice))
    ) {
      return undefined;
    }
    return Number(stakeAmount) * Number(ethPrice);
  }, [stakeAmount, ethPrice]);

  const willReceiveAmount = useMemo(() => {
    if (
      isNaN(Number(stakeAmount)) ||
      isNaN(Number(lsdEthRate)) ||
      Number(stakeAmount) === 0
    ) {
      return "--";
    }
    return Number(stakeAmount) / Number(lsdEthRate) + "";
  }, [stakeAmount, lsdEthRate]);

  const estimateFee = useMemo(() => {
    let gasLimit = 146316;

    if (isNaN(gasPrice)) {
      return "--";
    }

    return Web3.utils.fromWei(
      Web3.utils.toBN(gasLimit).mul(Web3.utils.toBN(gasPrice))
    );
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

  const [buttonDisabled, buttonText, isButtonSecondary] = useMemo(() => {
    if (walletNotConnected) {
      return [false, "Connect Wallet"];
    }
    if (isWrongMetaMaskNetwork) {
      return [
        false,
        `Wrong network, click to change into ${getEthereumChainName()}`,
        true,
      ];
    }
    if (
      !stakeAmount ||
      isNaN(Number(stakeAmount)) ||
      Number(stakeAmount) === 0 ||
      isNaN(Number(balance))
    ) {
      return [true, "Stake"];
    }

    if (Number(stakeAmount) < Number(ethMinimumDeposit)) {
      return [true, `Minimal Stake Amount is ${ethMinimumDeposit} ETH`];
    }

    if (
      Number(stakeAmount) +
        (isNaN(Number(estimateFee)) ? 0 : Number(estimateFee) * 1.4) >
      Number(balance)
    ) {
      return [true, `Not Enough ETH to Stake`];
    }

    return [false, "Stake"];
  }, [
    isWrongMetaMaskNetwork,
    balance,
    stakeAmount,
    walletNotConnected,
    estimateFee,
    ethMinimumDeposit,
  ]);

  const newRTokenBalance = useMemo(() => {
    if (isNaN(Number(lsdBalance))) {
      return "--";
    }

    if (isNaN(Number(stakeAmount)) || isNaN(Number(lsdEthRate))) {
      return "--";
    }
    return Number(lsdBalance) + Number(stakeAmount) * Number(lsdEthRate) + "";
  }, [lsdBalance, lsdEthRate, stakeAmount]);

  const clickConnectWallet = () => {
    dispatch(connectMetaMask(getEthereumChainId()));
  };

  const clickMax = () => {
    if (
      isWrongMetaMaskNetwork ||
      walletNotConnected ||
      isNaN(Number(balance))
    ) {
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
      handleEthStake(
        Number(stakeAmount) + "",
        willReceiveAmount,
        newRTokenBalance,
        false,
        (success) => {
          dispatch(updateEthBalance());
          if (success) {
            setStakeAmount("");
            dispatch(updateLsdEthBalance());
          }
        }
      )
    );
  };

  return (
    <div>
      <div className="h-[1.07rem] mt-[.18rem] pt-[.24rem] mx-[.24rem] bg-color-bgPage rounded-[.3rem]">
        <div className="mx-[.12rem] flex items-start">
          <div className="h-[.42rem] bg-color-bg2 rounded-[.3rem] flex items-center cursor-pointer">
            <div className="ml-[.08rem] flex items-center">
              <div className="w-[.34rem] h-[.34rem] relative">
                <Image src={getTokenIcon()} alt="logo" layout="fill" />
              </div>

              <div className="text-color-text1 text-[.16rem] ml-[.16rem]">
                {getTokenName()}
              </div>
            </div>

            <div className="ml-[.16rem] mr-[.16rem]">
              <Icomoon icon="arrow-down" size=".1rem" color="#848B97" />
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
                  className="bg-color-bg1 border-color-border1"
                  onClick={clickMax}
                  border={`0.01rem solid ${darkMode ? "#6C86AD80" : "#ffffff"}`}
                >
                  Max
                </CustomButton>
              </div>
            </div>

            <div className="mt-[.1rem] flex items-center justify-between text-[.14rem]">
              <div className="text-color-text2">
                {stakeValue
                  ? `$${formatNumber(stakeValue, { decimals: 2 })}`
                  : ""}{" "}
              </div>

              <div className="flex items-center">
                <div className="text-color-text2">Balance</div>
                <div className="ml-[.06rem] text-color-text1">
                  {formatNumber(balance)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CustomButton
        loading={stakeLoading}
        disabled={buttonDisabled}
        mt=".18rem"
        className="mx-[.24rem]"
        height=".56rem"
        type={isButtonSecondary ? "secondary" : "primary"}
        onClick={clickStake}
      >
        <div className="flex items-center">
          {buttonText}

          {(buttonText.indexOf("Wrong network") >= 0 ||
            buttonText.indexOf("Insufficient FIS.") >= 0) && (
            <div className="ml-[.12rem] flex items-center">
              <Icomoon icon="arrow-right" size=".12rem" color="#222C3C" />
            </div>
          )}
        </div>
      </CustomButton>

      <div
        className="mx-[.75rem] mt-[.24rem] grid items-stretch font-[500]"
        style={{ gridTemplateColumns: "40% 30% 30%" }}
      >
        <div className="flex justify-start ml-[.18rem]">
          <div className="flex flex-col items-center">
            <div className="text-text2/50 dark:text-text2Dark/50 text-[.14rem]">
              Will Receive
            </div>
            <div className="mt-[.1rem] text-color-text2 text-[.16rem]">
              {formatLargeAmount(willReceiveAmount)} {getLsdEthName()}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-text2/50 dark:text-text2Dark/50 text-[.14rem]">
            APR
          </div>

          {apr !== undefined ? (
            <div className="mt-[.1rem] text-color-text2 text-[.16rem]">
              {formatNumber(apr, { decimals: 2, toReadable: false })}%
            </div>
          ) : (
            <div className="mt-[.1rem]">
              <DataLoading height=".16rem" />
            </div>
          )}
        </div>

        <div className="flex justify-end mr-[.0rem]">
          <div className="flex flex-col items-center">
            <div className="text-text2/50 dark:text-text2Dark/50 text-[.14rem]">
              Est. Cost
            </div>

            <div className="mt-[.1rem] text-color-text2 text-[.16rem]">
              ${formatNumber(transactionCostValue, { decimals: 2 })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};