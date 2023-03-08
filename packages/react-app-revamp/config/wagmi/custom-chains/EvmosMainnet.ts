export const EvmosMainnet = {
  id: 9001,
  name: 'EvmosMainnet',
  network: 'EvmosMainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Evmos',
    symbol: 'EVMOS',
  },
  rpcUrls: {
    public: 'https://eth.bd.evmos.org:8545',
    default: 'https://eth.bd.evmos.org:8545',
  },
  blockExplorers: {
    escan: { name: 'escan.live', url: 'https://escan.live' },
    default: { name: 'escan.live', url: 'https://escan.live' },
  },
}
