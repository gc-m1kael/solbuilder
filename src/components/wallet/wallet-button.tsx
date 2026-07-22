import * as React from "react"
import { RiWalletLine } from "@remixicon/react"
import { PhantomWalletName } from "@solana/wallet-adapter-phantom"
import { useWallet } from "@solana/wallet-adapter-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function shortenAddress(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`
}

export function WalletButton() {
  const {
    publicKey,
    connected,
    connecting,
    disconnecting,
    select,
    connect,
    disconnect,
    wallet,
  } = useWallet()
  const [pendingConnect, setPendingConnect] = React.useState(false)

  React.useEffect(() => {
    if (!pendingConnect) {
      return
    }

    if (!wallet) {
      return
    }

    if (connected || connecting) {
      setPendingConnect(false)
      return
    }

    let cancelled = false

    void connect()
      .catch((error: unknown) => {
        console.error("Phantom connect failed", error)
      })
      .finally(() => {
        if (!cancelled) {
          setPendingConnect(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [pendingConnect, wallet, connected, connecting, connect])

  async function handleClick() {
    if (connected) {
      await disconnect()
      return
    }

    select(PhantomWalletName)
    setPendingConnect(true)
  }

  const label = connected && publicKey
    ? shortenAddress(publicKey.toBase58())
    : connecting || pendingConnect
      ? "Connecting…"
      : "Wallet"

  const tooltip = connected
    ? "Disconnect Phantom"
    : "Connect Phantom (devnet)"

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-7 rounded-md px-2 text-xs"
            onClick={() => {
              void handleClick()
            }}
            disabled={connecting || disconnecting || pendingConnect}
          >
            <RiWalletLine className="size-3.5" />
            {label}
          </Button>
        }
      />
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
