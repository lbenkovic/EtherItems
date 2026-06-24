import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { ADDRESSES } from "../utils/contracts";

declare global {
    interface Window {
        ethereum?: {
            request: (args: {
                method: string;
                params?: unknown[];
            }) => Promise<unknown>;
            on: (event: string, handler: (...args: unknown[]) => void) => void;
            removeListener: (
                event: string,
                handler: (...args: unknown[]) => void
            ) => void;
        };
    }
}

export interface WalletState {
    provider: ethers.BrowserProvider | null;
    signer: ethers.JsonRpcSigner | null;
    address: string | null;
    chainId: number | null;
    balance: string | null;
    error: string | null;
    connecting: boolean;
    isSupported: boolean;
    connect: () => Promise<void>;
    refreshBalance: () => Promise<void>;
}

export function useWallet(): WalletState {
    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(
        null
    );
    const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
    const [address, setAddress] = useState<string | null>(null);
    const [chainId, setChainId] = useState<number | null>(null);
    const [balance, setBalance] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [connecting, setConnecting] = useState(false);

    const isSupported = Boolean(chainId && ADDRESSES[chainId]);

    const refreshBalance = useCallback(async () => {
        if (!provider || !address) return;
        const bal = await provider.getBalance(address);
        setBalance(ethers.formatEther(bal));
    }, [provider, address]);

    const connect = useCallback(async () => {
        if (!window.ethereum) {
            setError("MetaMask not found. Install it from metamask.io");
            return;
        }
        setConnecting(true);
        setError(null);
        try {
            const prov = new ethers.BrowserProvider(window.ethereum);
            await prov.send("eth_requestAccounts", []);
            const sign = await prov.getSigner();
            const addr = await sign.getAddress();
            const network = await prov.getNetwork();
            const cId = Number(network.chainId);
            const bal = await prov.getBalance(addr);

            setProvider(prov);
            setSigner(sign);
            setAddress(addr);
            setChainId(cId);
            setBalance(ethers.formatEther(bal));
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Connection failed";
            setError(msg);
        } finally {
            setConnecting(false);
        }
    }, []);

    useEffect(() => {
        if (!window.ethereum) return;

        const handleAccountsChanged = (...args: unknown[]) => {
            const accounts = args[0] as string[];
            if (accounts.length === 0) {
                setAddress(null);
                setSigner(null);
                setProvider(null);
                setBalance(null);
            } else {
                connect();
            }
        };

        const handleChainChanged = () => window.location.reload();

        window.ethereum.on("accountsChanged", handleAccountsChanged);
        window.ethereum.on("chainChanged", handleChainChanged);

        return () => {
            window.ethereum?.removeListener(
                "accountsChanged",
                handleAccountsChanged
            );
            window.ethereum?.removeListener("chainChanged", handleChainChanged);
        };
    }, [connect]);

    return {
        provider,
        signer,
        address,
        chainId,
        balance,
        error,
        connecting,
        isSupported,
        connect,
        refreshBalance
    };
}
