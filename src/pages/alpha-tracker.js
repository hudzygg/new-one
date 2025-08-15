import React, { useCallback, useMemo, useState } from "react";
import Layout from "../components/layout";
import Seo from "../components/seo";

const formatNumber = (n) => {
	if (n === null || n === undefined) return "N/A";
	if (typeof n !== "number" || !Number.isFinite(n)) return String(n);
	return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const AlphaTracker = () => {
	const [tokenAddress, setTokenAddress] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [rows, setRows] = useState([]);
	const [meta, setMeta] = useState({ tokenSymbol: "", tokenName: "", nextOffset: 0, hasMore: false });

	const onScan = useCallback(async (offset = 0) => {
		const token = tokenAddress.trim().toLowerCase();
		if (!token.startsWith("0x") || token.length !== 42) {
			setError("Please enter a valid token contract address (0x...)");
			return;
		}
		setLoading(true);
		setError("");
		try {
			const res = await fetch(`/api/token/alpha?token=${token}&offset=${offset}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to fetch alpha wallets");
			if (offset === 0) setRows(data.wallets || []);
			else setRows((prev) => [...prev, ...(data.wallets || [])]);
			setMeta({ tokenSymbol: data.tokenSymbol || "", tokenName: data.tokenName || "", nextOffset: data.nextOffset || 0, hasMore: !!data.hasMore });
		} catch (e) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	}, [tokenAddress]);

	return (
		<Layout>
			<Seo title="AlphaTracker" />
			<div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
				<h1 style={{ margin: 0 }}>AlphaTracker</h1>
			</div>
			<div className="card" style={{ marginBottom: 12 }}>
				<div className="row">
					<input className="input" type="text" placeholder="0x... token contract" value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)} />
					<button className="btn primary" onClick={() => onScan(0)} disabled={loading}>{loading ? 'Scanning…' : 'Find Early Buyers'}</button>
				</div>
				{error && <div className="label" style={{ color: '#fca5a5' }}>{error}</div>}
			</div>

			{rows.length > 0 && (
				<div className="card">
					<h3 style={{ marginTop: 0 }}>Early Buyers for {meta.tokenSymbol} ({meta.tokenName})</h3>
					<div className="grid">
						{rows.map((r, i) => (
							<div key={`${r.wallet}-${i}`} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<div>
									<div style={{ fontWeight: 600 }}>{r.wallet.slice(0, 6)}...{r.wallet.slice(-4)}</div>
									<div className="label">Alpha: {r.isAlpha ? '✅' : '❌'} • Win Rate: {formatNumber(r.winRate)}%</div>
								</div>
								<div className="row">
									<a className="btn" href={`https://etherscan.io/address/${r.wallet}`} target="_blank" rel="noreferrer">Etherscan</a>
								</div>
							</div>
						))}
					</div>
					{meta.hasMore && (
						<div style={{ marginTop: 12 }}>
							<button className="btn" onClick={() => onScan(meta.nextOffset)} disabled={loading}>Scan next 10</button>
						</div>
					)}
				</div>
			)}
		</Layout>
	);
};

export default AlphaTracker;

export const Head = () => <Seo title="AlphaTracker" />;