import * as React from "react"
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react"
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom"

const FALLBACK_SOLANA_RPC_URL = "https://api.devnet.solana.com"

function getSolanaRpcUrl() {
  const configuredUrl = import.meta.env.VITE_SOLANA_RPC_URL?.trim()

  if (configuredUrl) {
    return configuredUrl
  }

  return FALLBACK_SOLANA_RPC_URL
}

type SolanaWalletProviderProps = {
  children: React.ReactNode
}

export function SolanaWalletProvider({ children }: SolanaWalletProviderProps) {
  const endpoint = React.useMemo(() => getSolanaRpcUrl(), [])
  const wallets = React.useMemo(() => [new PhantomWalletAdapter()], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  )
}
