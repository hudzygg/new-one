import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/layout";
import Seo from "../components/seo";

const formatNumber = (n) => {
	if (n === null || n === undefined) return "N/A";
	if (typeof n !== "number" || !Number.isFinite(n)) return String(n);
	return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const Dashboard = () => {
	const [walletAddress, setWalletAddress] = useState("");
	const [tokenAddress, setTokenAddress] = useState("");

	const [summary, setSummary] = useState(null);
	const [tokens, setTokens] = useState([]);
	const [loadingSummary, setLoadingSummary] = useState(false);
	const [loadingTokens, setLoadingTokens] = useState(false);
	const [error, setError] = useState("");

	// Settings
	const [sortPref, setSortPref] = useState("pnl"); // 'pnl' | 'date'
	const [showOverview, setShowOverview] = useState(true);
	const [showTrades, setShowTrades] = useState(true);
	const [showBalance, setShowBalance] = useState(true);
	const [showSmallPositions, setShowSmallPositions] = useState(true);
	const [tokensPerPage, setTokensPerPage] = useState(3);

	const [page, setPage] = useState(0);

	const fetchSummary = useCallback(async (address) => {
		setLoadingSummary(true);
		setError("");
		try {
			const res = await fetch(`/api/wallet/summary?address=${address}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to fetch summary");
			setSummary(data);
		} catch (e) {
			setSummary(null);
			setError(e.message);
		} finally {
			setLoadingSummary(false);
		}
	}, []);

	const fetchPerToken = useCallback(async (address) => {
		setLoadingTokens(true);
		setError("");
		try {
			const res = await fetch(`/api/wallet/tokens?address=${address}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to fetch tokens");
			setTokens(Array.isArray(data.data) ? data.data : []);
		} catch (e) {
			setTokens([]);
			setError(e.message);
		} finally {
			setLoadingTokens(false);
		}
	}, []);

	const onScanWallet = useCallback(async () => {
		const addr = walletAddress.trim().toLowerCase();
		if (!addr.startsWith("0x") || addr.length !== 42) {
			setError("Please enter a valid Ethereum address (0x...)");
			return;
		}
		setPage(0);
		await Promise.all([fetchSummary(addr), fetchPerToken(addr)]);
	}, [walletAddress, fetchSummary, fetchPerToken]);

	// Derived tokens list
	const filteredSortedTokens = useMemo(() => {
		let list = [...tokens];
		if (!showSmallPositions) {
			list = list.filter((t) => Math.abs(t.total_profit || 0) >= 30);
		}
		if (sortPref === "date") {
			list.sort((a, b) => (b.last_trade_timestamp || 0) - (a.last_trade_timestamp || 0));
		} else {
			list.sort((a, b) => (b.total_profit || 0) - (a.total_profit || 0));
		}
		return list;
	}, [tokens, showSmallPositions, sortPref]);

	const numPages = Math.max(1, Math.ceil(filteredSortedTokens.length / tokensPerPage));
	const currentPage = Math.min(page, numPages - 1);
	const pageSlice = filteredSortedTokens.slice(currentPage * tokensPerPage, currentPage * tokensPerPage + tokensPerPage);

	// Alpha scan state
	const [alphaLoading, setAlphaLoading] = useState(false);
	const [alphaError, setAlphaError] = useState("");
	const [alphaResults, setAlphaResults] = useState([]);
	const [alphaMeta, setAlphaMeta] = useState({ tokenSymbol: "", tokenName: "", nextOffset: 0, hasMore: false });

	const onScanAlpha = useCallback(async (offset = 0) => {
		const token = tokenAddress.trim().toLowerCase();
		if (!token.startsWith("0x") || token.length !== 42) {
			setAlphaError("Please enter a valid token contract address (0x...)");
			return;
		}
		setAlphaLoading(true);
		setAlphaError("");
		try {
			const res = await fetch(`/api/token/alpha?token=${token}&offset=${offset}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to fetch alpha wallets");
			if (offset === 0) {
				setAlphaResults(data.wallets || []);
			} else {
				setAlphaResults((prev) => [...prev, ...(data.wallets || [])]);
			}
			setAlphaMeta({ tokenSymbol: data.tokenSymbol || "", tokenName: data.tokenName || "", nextOffset: data.nextOffset || 0, hasMore: !!data.hasMore });
		} catch (e) {
			setAlphaError(e.message);
		} finally {
			setAlphaLoading(false);
		}
	}, [tokenAddress]);

	const onScanAlphaNext = useCallback(() => {
		onScanAlpha(alphaMeta.nextOffset || 0);
	}, [onScanAlpha, alphaMeta.nextOffset]);

	const isAlphaWallet = useMemo(() => {
		if (!summary) return false;
		const winRate = summary.win_rate || 0;
		const totalProfit = summary.total_profit || 0;
		const totalTrades = summary.total_trades || 0;
		return winRate >= 0.5 && totalProfit > 1000 && totalTrades >= 20;
	}, [summary]);

	return (
		<Layout>
			<Seo title="Dashboard" />

			<div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
				<h1 style={{ margin: 0 }}>Dashboard</h1>
				<div className="tabs">
					<button className="tab active">Wallet Summary</button>
					<button className="tab">Per‑Token</button>
					<button className="tab" onClick={() => { window.location.href = '/alpha-tracker/'; }}>Alpha by Token</button>
				</div>
			</div>

			<div className="card" style={{ marginBottom: 12 }}>
				<div className="row">
					<input className="input" type="text" placeholder="0x... wallet address" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} />
					<button className="btn primary" onClick={onScanWallet} disabled={loadingSummary || loadingTokens}>{loadingSummary || loadingTokens ? "Scanning..." : "Scan Wallet"}</button>
				</div>
				{error && <div className="label" style={{ color: '#fca5a5' }}>{error}</div>}
			</div>

			{summary && (
				<div className="card" style={{ marginBottom: 12 }}>
					<h3 style={{ marginTop: 0 }}>Wallet Summary</h3>
					<div className="grid cols">
						<div className="card">Alpha Wallet: {isAlphaWallet ? "Yes ✅" : "No ❌"}</div>
						<div className="card">Investment: ${formatNumber(summary.total_investment)}</div>
						<div className="card">Value: ${formatNumber(summary.total_value)}</div>
						<div className="card">Profit: ${formatNumber(summary.total_profit)}</div>
						<div className="card">ROI: {formatNumber(summary.total_return)}%</div>
						<div className="card">Win Rate: {formatNumber((summary.win_rate || 0) * 100)}%</div>
						<div className="card">Trades: {summary.total_trades}</div>
						<div className="card">Buy Vol: ${formatNumber(summary.total_buy_volume)}</div>
						<div className="card">Sell Vol: ${formatNumber(summary.total_sell_volume)}</div>
					</div>
				</div>
			)}

			<div className="card" style={{ marginBottom: 12 }}>
				<h3 style={{ marginTop: 0 }}>Per‑Token Breakdown</h3>
				<div className="row">
					<label className="label"><input type="radio" checked={sortPref === "pnl"} onChange={() => setSortPref("pnl")} /> Sort by PnL</label>
					<label className="label"><input type="radio" checked={sortPref === "date"} onChange={() => setSortPref("date")} /> Sort by Last Trade Date</label>
					<label className="label"><input type="checkbox" checked={showOverview} onChange={() => setShowOverview((v) => !v)} /> Show Overview</label>
					<label className="label"><input type="checkbox" checked={showTrades} onChange={() => setShowTrades((v) => !v)} /> Show Trades</label>
					<label className="label"><input type="checkbox" checked={showBalance} onChange={() => setShowBalance((v) => !v)} /> Show Balance</label>
					<label className="label"><input type="checkbox" checked={showSmallPositions} onChange={() => setShowSmallPositions((v) => !v)} /> Show Small Positions (&lt; $30 PnL)</label>
					<label className="label">Tokens per page: {" "}
						<select value={tokensPerPage} onChange={(e) => setTokensPerPage(Number(e.target.value))}>
							{[1, 2, 3, 4, 5].map((n) => (
								<option key={n} value={n}>{n}</option>
							))}
						</select>
					</label>
				</div>

				{loadingTokens && <div className="label">Loading tokens…</div>}

				{!loadingTokens && tokens.length > 0 && (
					<div>
						{showOverview && (
							<div className="card" style={{ marginBottom: 12 }}>
								<h4 style={{ marginTop: 0 }}>Wallet Overview</h4>
								{(() => {
									const totalInvestment = tokens.reduce((s, t) => s + (t.total_investment || 0), 0);
									const totalValue = tokens.reduce((s, t) => s + (t.total_value || 0), 0);
									const totalProfit = tokens.reduce((s, t) => s + (t.total_profit || 0), 0);
									const realized = tokens.reduce((s, t) => s + (t.realized_profit || 0), 0);
									const unrealized = tokens.reduce((s, t) => s + (t.unrealized_profit || 0), 0);
									const trades = tokens.reduce((s, t) => s + (t.total_trades || 0), 0);
									const buys = tokens.reduce((s, t) => s + (t.total_buys || 0), 0);
									const sells = tokens.reduce((s, t) => s + (t.total_sells || 0), 0);
									const roi = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;
									return (
										<div className="grid cols">
											<div className="card">Investment: ${formatNumber(totalInvestment)}</div>
											<div className="card">Value: ${formatNumber(totalValue)}</div>
											<div className="card">Profit: ${formatNumber(totalProfit)}</div>
											<div className="card">ROI: {formatNumber(roi)}%</div>
											<div className="card">Realized: ${formatNumber(realized)}</div>
											<div className="card">Unrealized: ${formatNumber(unrealized)}</div>
											<div className="card">Trades: {trades} (🛒 {buys} | 💸 {sells})</div>
										</div>
									);
								})()}
							</div>
						)}

						{pageSlice.map((t, idx) => (
							<div key={`${t.token_symbol}-${idx}`} className="card">
								<h4 style={{ marginTop: 0 }}>🪙 {t.token_symbol} — {t.token_name || 'N/A'}</h4>
								<div className="grid cols">
									<div className="card">Profit: ${formatNumber(t.total_profit)} ({formatNumber(t.total_return || 0)}%)</div>
									<div className="card">Invested: ${formatNumber(t.total_investment)}</div>
									<div className="card">Value: ${formatNumber(t.total_value)}</div>
									<div className="card">Realized: ${formatNumber(t.realized_profit)}</div>
									<div className="card">Unrealized: ${formatNumber(t.unrealized_profit)}</div>
									{showBalance && <div className="card">Balance: {formatNumber(t.trading_balance)}</div>}
									{showTrades && <div className="card">Trades: {t.total_trades || 0} (🛒 {t.total_buys || 0} | 💸 {t.total_sells || 0})</div>}
								</div>
								{(t.first_trade_timestamp || t.last_trade_timestamp) && (
									<div className="label">{t.first_trade_timestamp && <span>First: {new Date(t.first_trade_timestamp * 1000).toUTCString()} </span>}{t.last_trade_timestamp && <span>| Last: {new Date(t.last_trade_timestamp * 1000).toUTCString()}</span>}</div>
								)}
							</div>
						))}

						{numPages > 1 && (
							<div className="row" style={{ marginTop: 8 }}>
								<button className="btn" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0}>‹ Prev</button>
								<span className="label">{currentPage + 1} / {numPages}</span>
								<button className="btn" onClick={() => setPage((p) => Math.min(numPages - 1, p + 1))} disabled={currentPage === numPages - 1}>Next ›</button>
								<button className="btn" onClick={() => setPage(0)} disabled={currentPage === 0}>« First</button>
								<button className="btn" onClick={() => setPage(numPages - 1)} disabled={currentPage === numPages - 1}>Last »</button>
							</div>
						)}
					</div>
				)}
			</div>

			<div className="card">
				<h3 style={{ marginTop: 0 }}>Alpha Wallets by Token</h3>
				<div className="row">
					<input className="input" type="text" placeholder="0x... token contract" value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)} />
					<button className="btn" onClick={() => onScanAlpha(0)} disabled={alphaLoading}>{alphaLoading ? 'Scanning...' : 'Find Early Buyers'}</button>
				</div>
				{alphaError && <div className="label" style={{ color: '#fca5a5' }}>{alphaError}</div>}
				{alphaResults.length > 0 && (
					<div style={{ marginTop: 12 }}>
						<h4 style={{ marginTop: 0 }}>Early Buyers for {alphaMeta.tokenSymbol} ({alphaMeta.tokenName})</h4>
						<div className="grid">
							{alphaResults.map((r, idx) => (
								<div key={`${r.wallet}-${idx}`} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
						{alphaMeta.hasMore && (
							<div style={{ marginTop: 12 }}>
								<button className="btn" onClick={onScanAlphaNext} disabled={alphaLoading}>Scan next 10</button>
							</div>
						)}
					</div>
				)}
			</div>
		</Layout>
	);
};

export default Dashboard;

export const Head = () => <Seo title="Swiftyy Dashboard" />;