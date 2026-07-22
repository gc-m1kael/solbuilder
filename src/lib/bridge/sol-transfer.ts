import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  type TransactionSignature,
} from "@solana/web3.js"

export const MAX_TRANSFER_SOL = 0.1
export const TRANSFER_TIMEOUT_MS = 20_000

export type SolTransferExecutionResult =
  | { status: "success"; signature: TransactionSignature }
  | { status: "error"; error: string }
  | { status: "cancelled"; error: string }

export function validateTransferAmount(amountSol: number): string | null {
  if (!Number.isFinite(amountSol) || amountSol <= 0) {
    return "Amount must be greater than 0 SOL"
  }

  if (amountSol > MAX_TRANSFER_SOL) {
    return `Amount must be at most ${MAX_TRANSFER_SOL} SOL`
  }

  return null
}

export function parseRecipientPublicKey(recipient: string): PublicKey | string {
  try {
    return new PublicKey(recipient)
  } catch {
    return "Invalid recipient public key"
  }
}

export function isUserCancellation(error: unknown): boolean {
  if (!error) {
    return false
  }

  const name = error instanceof Error ? error.name : ""
  const message = error instanceof Error ? error.message : String(error)

  if (name === "WalletWindowClosedError") {
    return true
  }

  return /user rejected|rejected the request|rejected signature|cancelled|canceled|denied/i.test(
    message
  )
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error) || !error.message) {
    return "Transfer failed"
  }

  const message = error.message

  if (/timed out|timeout/i.test(message)) {
    return "Transfer timed out after 20 seconds"
  }

  if (
    /insufficient (funds|lamports)|attempt to debit an account but found no record of a prior credit|InsufficientFunds/i.test(
      message
    )
  ) {
    return "Insufficient SOL balance for this transfer"
  }

  if (/failed to fetch|networkerror|rpc|429|502|503|504|ECONNRESET|ETIMEDOUT/i.test(message)) {
    return `RPC failure: ${message}`
  }

  return message
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(timeoutMessage))
    }, timeoutMs)

    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timer)
        reject(error)
      }
    )
  })
}

type ExecuteSolTransferArgs = {
  connection: Connection
  fromPublicKey: PublicKey
  recipient: PublicKey
  amountSol: number
  sendTransaction: (
    transaction: Transaction,
    connection: Connection
  ) => Promise<TransactionSignature>
  signTransaction?: (transaction: Transaction) => Promise<Transaction>
}

async function sendAndConfirmTransfer({
  connection,
  fromPublicKey,
  recipient,
  lamports,
  sendTransaction,
  signTransaction,
}: {
  connection: Connection
  fromPublicKey: PublicKey
  recipient: PublicKey
  lamports: number
  sendTransaction: (
    transaction: Transaction,
    connection: Connection
  ) => Promise<TransactionSignature>
  signTransaction?: (transaction: Transaction) => Promise<Transaction>
}): Promise<TransactionSignature> {
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed")

  const transaction = new Transaction({
    feePayer: fromPublicKey,
    blockhash,
    lastValidBlockHeight,
  }).add(
    SystemProgram.transfer({
      fromPubkey: fromPublicKey,
      toPubkey: recipient,
      lamports,
    })
  )

  let signature: TransactionSignature

  if (signTransaction) {
    const signed = await signTransaction(transaction)
    signature = await connection.sendRawTransaction(signed.serialize(), {
      preflightCommitment: "confirmed",
    })
  } else {
    signature = await sendTransaction(transaction, connection)
  }

  const confirmation = await connection.confirmTransaction(
    {
      signature,
      blockhash,
      lastValidBlockHeight,
    },
    "confirmed"
  )

  if (confirmation.value.err) {
    throw new Error(
      `Transaction confirmed with error: ${JSON.stringify(confirmation.value.err)}`
    )
  }

  return signature
}

export async function executeSolTransfer({
  connection,
  fromPublicKey,
  recipient,
  amountSol,
  sendTransaction,
  signTransaction,
}: ExecuteSolTransferArgs): Promise<SolTransferExecutionResult> {
  const amountError = validateTransferAmount(amountSol)
  if (amountError) {
    return { status: "error", error: amountError }
  }

  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL)
  if (lamports <= 0) {
    return { status: "error", error: "Amount is too small" }
  }

  try {
    const signature = await withTimeout(
      sendAndConfirmTransfer({
        connection,
        fromPublicKey,
        recipient,
        lamports,
        sendTransaction,
        signTransaction,
      }),
      TRANSFER_TIMEOUT_MS,
      "Transfer timed out after 20 seconds"
    )

    return { status: "success", signature }
  } catch (error) {
    if (isUserCancellation(error)) {
      return {
        status: "cancelled",
        error: getErrorMessage(error) || "Transfer cancelled",
      }
    }

    return {
      status: "error",
      error: getErrorMessage(error),
    }
  }
}
