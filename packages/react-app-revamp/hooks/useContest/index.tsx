import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { chain, useAccount, useContractRead, useEnsName, useNetwork, useToken } from "wagmi";
import { fetchEnsName, readContract } from "@wagmi/core";
import create from "zustand";
import createContext from "zustand/context";
import shallow from "zustand/shallow";
import DeployedContestContract from "@contracts/bytecodeAndAbi/Contest.sol/Contest.json";
import { chains } from "@config/wagmi";
import isUrlToImage from "@helpers/isUrlToImage";
import toast from "react-hot-toast";

export const { Provider, useStore } = createContext();

export const createStore = () => {
  return create(set => ({
    contestStatus: null,
    contestName: null,
    contestAuthor: null,
    submissionsOpen: null,
    votesOpen: null,
    votesClose: null,
    votingToken: null,
    votingTokenAddress: null,
    currentUserAvailableVotesAmount: null,
    listProposalsIds: [],
    listProposalsData: {},
    isListProposalsLoading: true,
    setContestStatus: (state: number) => set({ contestStatus: state }),
    setContestName: (name: string) => set({ contestName: name }),
    setContestAuthor: (author: string) => set({ contestAuthor: author }),
    setSubmissionsOpen: (datetime: string) => set({ submissionsOpen: datetime }),
    setVotesOpen: (datetime: string) => set({ votesOpen: datetime }),
    setVotesClose: (datetime: string) => set({ votesClose: datetime }),
    setVotingToken: (token: any) => set({ votingToken: token }),
    setVotingTokenAddress: (address: any) => set({ votingTokenAddress: address }),
    setCurrentUserAvailableVotesAmount: (amount: number) => set({ currentUserAvailableVotesAmount: amount }),
    setListProposalsIds: (list: any) => set({ listProposalsIds: list }),
    setIsListProposalsLoading: (value: boolean) => set({ isListProposalsLoading: value }),
    //@ts-ignore
    setProposalData: ({ id, data }) =>
      set(state => ({
        ...state,
        listProposalsData: {
          //@ts-ignore
          ...state.listProposalsData,
          [id]: data,
        },
      })),
  }));
};

export const stateContest = {
  [0]: "Active (voting is open)",
  [1]: "Cancelled",
  [2]: "Queued (proposal submissions are open)",
  [3]: "Completed",
};

export function useContest() {
  const { asPath } = useRouter();
  const [url] = useState(asPath.split("/"));
  const { activeChain } = useNetwork();
  const [chainId] = useState(chains.filter(chain => chain.name.toLowerCase() === url[2])?.[0]?.id);
  const [canFetch, setCanFetch] = useState(chainId === activeChain?.id);
  const [address] = useState(url[3]);
  const {
    setContestName,
    setProposalData,
    setContestAuthor,
    contestAuthor,
    setSubmissionsOpen,
    setContestStatus,
    setVotingTokenAddress,
    votingTokenAddress,
    setVotingToken,
    setVotesOpen,
    setCurrentUserAvailableVotesAmount,
    setListProposalsIds,
    isListProposalsLoading,
    setIsListProposalsLoading,
    setVotesClose,
  } = useStore(
    state => ({
      //@ts-ignore
      setContestName: state.setContestName,
      //@ts-ignore
      contestAuthor: state.contestAuthor,
      //@ts-ignore
      setContestAuthor: state.setContestAuthor,
      //@ts-ignore
      setVotingTokenAddress: state.setVotingTokenAddress,
      //@ts-ignore
      votingTokenAddress: state.votingTokenAddress,
      //@ts-ignore
      setVotingToken: state.setVotingToken,
      //@ts-ignore
      setSubmissionsOpen: state.setSubmissionsOpen,
      //@ts-ignore
      setVotesClose: state.setVotesClose,
      //@ts-ignore
      setVotesOpen: state.setVotesOpen,
      //@ts-ignore
      setContestStatus: state.setContestStatus,
      //@ts-ignore
      setCurrentUserAvailableVotesAmount: state.setCurrentUserAvailableVotesAmount,
      //@ts-ignore
      listProposalsIds: state.listProposalsIds,
      //@ts-ignore
      setProposalData: state.setProposalData,
      //@ts-ignore
      setIsListProposalsLoading: state.setIsListProposalsLoading,
      //@ts-ignore
      setListProposalsIds: state.setListProposalsIds,
      //@ts-ignore
      isListProposalsLoading: state.isListProposalsLoading,
    }),
    shallow,
  );

  const { data, isLoading } = useAccount();
  const nameRawData = useContractRead(
    {
      //@ts-ignore
      addressOrName: address,
      contractInterface: DeployedContestContract.abi,
    },
    "name",
    {
      chainId,
      onSuccess: data => setContestName(data),
      onError: onContractError,
      enabled: canFetch,
    },
  );

  const contestAuthorRawData = useContractRead(
    {
      //@ts-ignore
      addressOrName: address,
      contractInterface: DeployedContestContract.abi,
    },
    "creator",
    {
      chainId,
      onSuccess: data => setContestAuthor(data),
      onError: onContractError,
      enabled: nameRawData.isSuccess && canFetch,
    },
  );

  const contestAuthorENSRawData = useEnsName({
    address: contestAuthor,
    chainId,
    onSuccess: data => setContestAuthor(data),
    onError: onContractError,
    enabled: nameRawData.isSuccess && activeChain?.id === chain.mainnet.id && canFetch && contestAuthor !== null,
  });

  const tokenAddressRawData = useContractRead(
    {
      //@ts-ignore
      addressOrName: address,
      contractInterface: DeployedContestContract.abi,
    },
    "token",
    {
      chainId,
      enabled: nameRawData.isSuccess && canFetch,
      onError: onContractError,
      onSuccess: data => setVotingTokenAddress(data),
    },
  );

  const tokenRawData = useToken({
    enabled: nameRawData.isSuccess && canFetch && votingTokenAddress !== null,
    address: votingTokenAddress,
    chainId,
  });

  const submissionsOpenRawData = useContractRead(
    {
      //@ts-ignore
      addressOrName: address,
      contractInterface: DeployedContestContract.abi,
    },
    "contestStart",
    {
      chainId,
      //@ts-ignore
      onSuccess: data => setSubmissionsOpen(new Date(parseInt(data) * 1000)),
      onError: onContractError,
      enabled: nameRawData.isSuccess && canFetch,
    },
  );
  const deadlineRawData = useContractRead(
    {
      //@ts-ignore
      addressOrName: address,
      contractInterface: DeployedContestContract.abi,
    },
    "contestDeadline",
    {
      chainId,
      //@ts-ignore
      onSuccess: data => setVotesClose(new Date(parseInt(data) * 1000)),
      onError: onContractError,
      enabled: nameRawData.isSuccess && canFetch,
    },
  );
  const votesOpenRawData = useContractRead(
    {
      //@ts-ignore
      addressOrName: address,
      contractInterface: DeployedContestContract.abi,
    },
    "voteStart",
    {
      chainId,
      enabled: nameRawData.isSuccess && canFetch,
      //@ts-ignore
      onSuccess: data => setVotesOpen(new Date(parseInt(data) * 1000)),
      onError: onContractError,
    },
  );
  const statusRawData = useContractRead(
    {
      //@ts-ignore
      addressOrName: address,
      contractInterface: DeployedContestContract.abi,
    },
    "state",
    {
      chainId,
      enabled: nameRawData.isSuccess && canFetch,
      onSuccess: data => setContestStatus(data),
      onError: onContractError,
    },
  );
  const amountOfTokensRequiredToSubmitEntryRawData = useContractRead(
    {
      //@ts-ignore
      addressOrName: address,
      contractInterface: DeployedContestContract.abi,
    },
    "proposalThreshold",
    {
      chainId,
      enabled: nameRawData.isSuccess && canFetch,
      onError: onContractError,
    },
  );
  const usersQualifyToVoteIfTheyHoldTokenAtTimeRawData = useContractRead(
    {
      //@ts-ignore
      addressOrName: address,
      contractInterface: DeployedContestContract.abi,
    },
    "contestSnapshot",
    {
      chainId,
      enabled: nameRawData.isSuccess && canFetch,
      //@ts-ignore
      onSuccess: data => setVotesOpen(new Date(parseInt(data) * 1000)),
      onError: onContractError,
    },
  );
  const currentAddressTotalVotesRawData = useContractRead(
    {
      //@ts-ignore
      addressOrName: address,
      contractInterface: DeployedContestContract.abi,
    },
    "contestAddressTotalVotesCast",
    {
      chainId,
      cacheOnBlock: true,
      args: data?.address,
      enabled: nameRawData.isSuccess && data?.address && canFetch ? true : false,
      onSuccess: data => setCurrentUserAvailableVotesAmount(data),
      onError: onContractError,
    },
  );

  const proposalsIdsRawData = useContractRead(
    {
      //@ts-ignore
      addressOrName: address,
      contractInterface: DeployedContestContract.abi,
    },
    "getAllProposalIds",
    {
      chainId,
      enabled: nameRawData.isSuccess && canFetch,
      onError: onContractError,
      onSuccess: data => {
        setListProposalsIds(data);
        if (data.length === 0) {
          setIsListProposalsLoading(false);
        } else {
          //@ts-ignore
          fetchAllProposals(data);
        }
      },
    },
  );

  function onContractError(err: any) {
    let toastMessage = err?.message ?? err;
    if (err.code === "CALL_EXCEPTION") toastMessage = "This contract doesn't exist on this chain.";
    toast.error(toastMessage);
  }

  async function fetchAllProposals(list: Array<any>) {
    try {
      await Promise.all(
        list.map(async (id: number) => {
          const proposalRawData = await readContract(
            {
              //@ts-ignore
              addressOrName: address,
              contractInterface: DeployedContestContract.abi,
            },
            "getProposal",
            {
              args: id,
              chainId,
            },
          );
          const proposalVotesData = await readContract(
            {
              //@ts-ignore
              addressOrName: address,
              contractInterface: DeployedContestContract.abi,
            },
            "proposalVotes",
            {
              args: id,
              chainId,
            },
          );

          const author = await fetchEnsName({
            address: proposalRawData[0],
            chainId: chain.mainnet.id,
          });
          const proposalData = {
            author: author ?? proposalRawData[0],
            content: proposalRawData[1],
            isContentImage: isUrlToImage(proposalRawData[1]) ? true : false,
            exists: proposalRawData[2],
            votes: proposalVotesData / 1e18,
          };
          setProposalData({ id, data: proposalData });
        }),
      );
      setIsListProposalsLoading(false);
    } catch (e) {
      console.error(e);
      setIsListProposalsLoading(false);
    }
  }

  useEffect(() => {
    if (activeChain?.id !== chainId) {
      setCanFetch(false);
    } else {
      setCanFetch(true);
    }
  }, [activeChain]);

  useEffect(() => {
    if (activeChain?.id === chainId && tokenRawData?.data) {
      setVotingToken(tokenRawData.data);
    }
  }, [activeChain?.id, tokenRawData.data]);

  const datalist = [
    statusRawData,
    contestAuthorRawData,
    submissionsOpenRawData,
    usersQualifyToVoteIfTheyHoldTokenAtTimeRawData,
    amountOfTokensRequiredToSubmitEntryRawData,
    nameRawData,
    tokenAddressRawData,
    tokenRawData,
    currentAddressTotalVotesRawData,
    deadlineRawData,
    votesOpenRawData,
    proposalsIdsRawData,
  ];

  return {
    address,
    chainId,
    canFetch,
    retry: async () => {
      await Promise.all(
        datalist
          .filter(e => e.isError)
          .map(async fn => {
            await fn.refetch();
          }),
      );
    },
    isSuccess: datalist.filter(e => e.isSuccess).length === datalist.length,
    isError: datalist.filter(e => e.isError).length > 0,
    isLoading:
      !canFetch ||
      !tokenRawData.data ||
      isLoading ||
      isListProposalsLoading ||
      datalist.filter(e => e.isFetching === false && e.isLoading === false && e.isRefetching === false && e.isSuccess)
        .length < datalist.length,
  };
}

export default useContest;
