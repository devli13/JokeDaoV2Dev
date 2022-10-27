import { useRouter } from "next/router";
import toast from "react-hot-toast";
import { chains } from "@config/wagmi";
import getContestContractVersion from "@helpers/getContestContractVersion";
import getRewardsModuleContractVersion from "@helpers/getRewardsModuleContractVersion";
import { alchemyRpcUrls, readContract, readContracts } from "@wagmi/core";
import { useStore } from "./store";

export function useRewardsModule() {
  const { asPath } = useRouter();
  const {
    //@ts-ignore
    setIsLoadingModule,
    //@ts-ignore
    setIsLoadingModuleError,
    //@ts-ignore
    setIsLoadingModuleSuccess,
    //@ts-ignore
    setRewardsModule,
  } = useStore();

  async function getContestRewardsModule() {
    setIsLoadingModule(true);
    setIsLoadingModuleError(null);
    setIsLoadingModuleSuccess(false);

    try {
      const contestAddress = asPath.split("/")[3];
      const contestChainName = asPath.split("/")[2];
      const chainId = chains.filter(chain => chain.name.toLowerCase().replace(" ", "") === contestChainName)?.[0]?.id;
      const abiContest = await getContestContractVersion(contestAddress, contestChainName);
      if (abiContest === null) {
        setIsLoadingModule(false);
        setIsLoadingModuleError("This contract doesn't exist on this chain.");
        setIsLoadingModuleSuccess(false);
        toast.error("This contract doesn't exist on this chain.");
        return;
      }
      const contestRewardModuleAddress = await readContract({
        addressOrName: contestAddress,
        contractInterface: abiContest,
        chainId,
        functionName: "officialRewardsModule",
      });
      const abiRewardsModule = await getRewardsModuleContractVersion(contestRewardModuleAddress, contestChainName);
      if (abiRewardsModule === null) {
        toast.error("The contract of this rewards module doesn't exist on this chain.");
        return;
      }

      const configRewardsModuleContract = {
        addressOrName: contestRewardModuleAddress,
        contractInterface: abiRewardsModule,
        chainId,
      };
      const contractsRewardsModule = [
        {
          ...configRewardsModuleContract,
          functionName: "creator",
        },
        {
          ...configRewardsModuleContract,
          functionName: "getPayees",
        },
        {
          ...configRewardsModuleContract,
          functionName: "totalShares",
        },
      ];

      const rewardsModule = await readContracts({
        contracts: contractsRewardsModule,
      });
      /*
      if(process.env.NEXT_PUBLIC_ALCHEMY_KEY) {
        // Get rewards module contract balance
        // See: https://docs.alchemy.com/docs/how-to-get-all-tokens-owned-by-an-address   
        const alchemyRpc = Object.keys(alchemyRpcUrls).filter(url => url.toLowerCase() === contestChainName)[0]  
        const alchemyAppUrl = `${alchemyRpcUrls[alchemyRpc]}/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`
        const response = await fetch(alchemyAppUrl, {
          method: 'POST',
          body: JSON.stringify({
            "jsonrpc": "2.0",
            "method": "alchemy_getTokenBalances",
            "headers": {
              "Content-Type": "application/json"
            },
            "params": [
              `${contestRewardModuleAddress}`,
              "erc20",
            ],
            "id": 42
          }),
          redirect: 'follow',
        })
        const result = await response.json()
        // Remove tokens with zero balance
        rewardsModuleERC20Balances = result?.tokenBalances?.filter((token: any) => {
           return token['tokenBalance'] !== '0'
        })
      }
      */
      setIsLoadingModule(false);
      setRewardsModule({
        contractAddress: contestRewardModuleAddress,
        creator: rewardsModule[0],
        payees: rewardsModule[1],
        totalShares: rewardsModule[2],
        blockExplorers: chains.filter(chain => chain.name.toLowerCase().replace(" ", "") === contestChainName)?.[0]
          ?.blockExplorers?.default,
        // balances: rewardsModuleERC20Balances
      });
      setIsLoadingModuleSuccess(true);
    } catch (e) {
      setIsLoadingModule(false);
      // @ts-ignore
      setIsLoadingModuleError(e?.message ?? e);
      setIsLoadingModuleSuccess(false);
      console.error(e);
    }
  }

  return {
    getContestRewardsModule,
  };
}

export default useRewardsModule;