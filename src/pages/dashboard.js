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

			<h1>Swiftyy Dashboard</h1>

			<section style={{ marginBottom: 32 }}>
				<h2>Wallet Scan</h2>
				<div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
					<input
						type="text"
						placeholder="0x... wallet address"
						value={walletAddress}
						onChange={(e) => setWalletAddress(e.target.value)}
						style={{ flex: 1, minWidth: 320, padding: 8 }}
					/>
					<button onClick={onScanWallet} disabled={loadingSummary || loadingTokens}>
						{loadingSummary || loadingTokens ? "Scanning..." : "Scan Wallet"}
					</button>
				</div>
				{error && <p style={{ color: "#d00" }}>{error}</p>}

				{summary && (
					<div style={{ marginTop: 16, padding: 16, border: "1px solid #eee", borderRadius: 8 }}>
						<h3 style={{ marginTop: 0 }}>Wallet Summary</h3>
						<p>
							<strong>Alpha Wallet:</strong> {isAlphaWallet ? "Yes ✅" : "No ❌"}
						</p>
						<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
							<div>Investment: ${formatNumber(summary.total_investment)}</div>
							<div>Value: ${formatNumber(summary.total_value)}</div>
							<div>Profit: ${formatNumber(summary.total_profit)}</div>
							<div>ROI: {formatNumber(summary.total_return)}%</div>
							<div>Win Rate: {formatNumber((summary.win_rate || 0) * 100)}%</div>
							<div>Trades: {summary.total_trades}</div>
							<div>Buy Vol: ${formatNumber(summary.total_buy_volume)}</div>
							<div>Sell Vol: ${formatNumber(summary.total_sell_volume)}</div>
						</div>
						{(summary.first_trade_timestamp || summary.last_trade_timestamp) && (
							<p style={{ marginTop: 8 }}>
								{summary.first_trade_timestamp && (
									<span>First Trade: {new Date(summary.first_trade_timestamp * 1000).toUTCString()} </span>
								)}
								{summary.last_trade_timestamp && (
									<span> | Last Trade: {new Date(summary.last_trade_timestamp * 1000).toUTCString()}</span>
								)}
							</p>
						)}
					</div>
				)}
			</section>

			<section style={{ marginBottom: 32 }}>
				<h2>Per-Token Breakdown</h2>
				<div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
					<label>
						<input type="radio" checked={sortPref === "pnl"} onChange={() => setSortPref("pnl")} /> Sort by PnL
					</label>
					<label>
						<input type="radio" checked={sortPref === "date"} onChange={() => setSortPref("date")} /> Sort by Last Trade Date
					</label>
					<label>
						<input type="checkbox" checked={showOverview} onChange={() => setShowOverview((v) => !v)} /> Show Overview
					</label>
					<label>
						<input type="checkbox" checked={showTrades} onChange={() => setShowTrades((v) => !v)} /> Show Trades
					</label>
					<label>
						<input type="checkbox" checked={showBalance} onChange={() => setShowBalance((v) => !v)} /> Show Balance
					</label>
					<label>
						<input type="checkbox" checked={showSmallPositions} onChange={() => setShowSmallPositions((v) => !v)} /> Show Small Positions (< $30 PnL)
					</label>
					<label>
						Tokens per page:
						<select value={tokensPerPage} onChange={(e) => setTokensPerPage(Number(e.target.value))}>
							{[1, 2, 3, 4, 5].map((n) => (
								<option key={n} value={n}>{n}</option>
							))}
						</select>
					</label>
				</div>

				{loadingTokens && <p>Loading tokens…</p>}

				{!loadingTokens && tokens.length > 0 && (
					<div style={{ marginTop: 12 }}>
						{showOverview && (
							<div style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, marginBottom: 12 }}>
								<h3 style={{ marginTop: 0 }}>Wallet Overview</h3>
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
										<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
											<div>Investment: ${formatNumber(totalInvestment)}</div>
											<div>Value: ${formatNumber(totalValue)}</div>
											<div>Profit: ${formatNumber(totalProfit)}</div>
											<div>ROI: {formatNumber(roi)}%</div>
											<div>Realized: ${formatNumber(realized)}</div>
											<div>Unrealized: ${formatNumber(unrealized)}</div>
											<div>Trades: {trades} (🛒 {buys} | 💸 {sells})</div>
										</div>
									);
								})()}
							</div>
						)}

						{pageSlice.map((t, idx) => (
							<div key={`${t.token_symbol}-${idx}`} style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, marginBottom: 12 }}>
								<h3 style={{ marginTop: 0 }}>🪙 {t.token_symbol} — {t.token_name || 'N/A'}</h3>
								<p>{(t.total_profit || 0) > 0 ? '✅' : '❌'} Profit: ${formatNumber(t.total_profit)} | ROI: {formatNumber(t.total_return || 0)}%</p>
								<p>Invested: ${formatNumber(t.total_investment)} | Value: ${formatNumber(t.total_value)}</p>
								{showTrades && (
									<p>Trades: {t.total_trades || 0} (🛒 {t.total_buys || 0} | 💸 {t.total_sells || 0})</p>
								)}
								<p>Realized: ${formatNumber(t.realized_profit)} | Unrealized: ${formatNumber(t.unrealized_profit)}</p>
								{showBalance && <p>Balance: {formatNumber(t.trading_balance)}</p>}
								{(t.first_trade_timestamp || t.last_trade_timestamp) && (
									<p>
										{t.first_trade_timestamp && <span>First: {new Date(t.first_trade_timestamp * 1000).toUTCString()} </span>}
										{t.last_trade_timestamp && <span>| Last: {new Date(t.last_trade_timestamp * 1000).toUTCString()}</span>}
									</p>
								)}
							</div>
						))}

						{numPages > 1 && (
							<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
								<button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0}>‹ Prev</button>
								<span>{currentPage + 1} / {numPages}</span>
								<button onClick={() => setPage((p) => Math.min(numPages - 1, p + 1))} disabled={currentPage === numPages - 1}>Next ›</button>
								<button onClick={() => setPage(0)} disabled={currentPage === 0}>« First</button>
								<button onClick={() => setPage(numPages - 1)} disabled={currentPage === numPages - 1}>Last »</button>
							</div>
						)}
					</div>
				)}
			</section>

			<section style={{ marginBottom: 32 }}>
				<h2>Alpha Wallets by Token</h2>
				<div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
					<input
						type="text"
						placeholder="0x... token contract"
						value={tokenAddress}
						onChange={(e) => setTokenAddress(e.target.value)}
						style={{ flex: 1, minWidth: 320, padding: 8 }}
					/>
					<button onClick={() => onScanAlpha(0)} disabled={alphaLoading}>{alphaLoading ? 'Scanning...' : 'Find Early Buyers'}</button>
				</div>
				{alphaError && <p style={{ color: "#d00" }}>{alphaError}</p>}
				{alphaResults.length > 0 && (
					<div style={{ marginTop: 12 }}>
						<h3 style={{ marginTop: 0 }}>Early Buyers for {alphaMeta.tokenSymbol} ({alphaMeta.tokenName})</h3>
						<ol>
							{alphaResults.map((r, idx) => (
								<li key={`${r.wallet}-${idx}`} style={{ marginBottom: 8 }}>
									<span style={{ marginRight: 8 }}>{r.wallet.slice(0, 6)}...{r.wallet.slice(-4)}</span>
									<span style={{ marginRight: 8 }}>Alpha: {r.isAlpha ? '✅' : '❌'}</span>
									<span style={{ marginRight: 8 }}>Win Rate: {formatNumber(r.winRate)}%</span>
									<button onClick={() => { setWalletAddress(r.wallet); }}>Use in Wallet Scan</button>
								</li>
							))}
						</ol>
						{alphaMeta.hasMore && (
							<button onClick={onScanAlphaNext} disabled={alphaLoading}>Scan next 10</button>
						)}
					</div>
				)}
			</section>
		</Layout>
	);
};

export default Dashboard;

export const Head = () => <Seo title="Swiftyy Dashboard" />;