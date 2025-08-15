import React, { useEffect, useState } from "react";
import Layout from "../components/layout";
import Seo from "../components/seo";

const Settings = () => {
	const [sortPref, setSortPref] = useState('pnl');
	const [showOverview, setShowOverview] = useState(true);
	const [showTrades, setShowTrades] = useState(true);
	const [showBalance, setShowBalance] = useState(true);
	const [showSmallPositions, setShowSmallPositions] = useState(true);
	const [tokensPerPage, setTokensPerPage] = useState(3);

	useEffect(() => {
		setSortPref(localStorage.getItem('swiftyy_sort_pref') || 'pnl');
		setShowOverview(localStorage.getItem('swiftyy_show_overview') !== 'false');
		setShowTrades(localStorage.getItem('swiftyy_show_trades') !== 'false');
		setShowBalance(localStorage.getItem('swiftyy_show_balance') !== 'false');
		setShowSmallPositions(localStorage.getItem('swiftyy_show_small_positions') !== 'false');
		setTokensPerPage(Number(localStorage.getItem('swiftyy_tokens_per_page') || 3));
	}, []);

	const onSave = () => {
		localStorage.setItem('swiftyy_sort_pref', sortPref);
		localStorage.setItem('swiftyy_show_overview', String(showOverview));
		localStorage.setItem('swiftyy_show_trades', String(showTrades));
		localStorage.setItem('swiftyy_show_balance', String(showBalance));
		localStorage.setItem('swiftyy_show_small_positions', String(showSmallPositions));
		localStorage.setItem('swiftyy_tokens_per_page', String(tokensPerPage));
		alert('Settings saved');
	};

	return (
		<Layout>
			<Seo title="Settings" />
			<h1>Settings</h1>
			<div className="card">
				<div className="row" style={{ marginBottom: 12 }}>
					<label className="label"><input type="radio" checked={sortPref === 'pnl'} onChange={() => setSortPref('pnl')} /> Sort by PnL</label>
					<label className="label"><input type="radio" checked={sortPref === 'date'} onChange={() => setSortPref('date')} /> Sort by Last Trade Date</label>
				</div>
				<div className="row" style={{ marginBottom: 12 }}>
					<label className="label"><input type="checkbox" checked={showOverview} onChange={() => setShowOverview(v=>!v)} /> Show Overview</label>
					<label className="label"><input type="checkbox" checked={showTrades} onChange={() => setShowTrades(v=>!v)} /> Show Trades</label>
					<label className="label"><input type="checkbox" checked={showBalance} onChange={() => setShowBalance(v=>!v)} /> Show Balance</label>
					<label className="label"><input type="checkbox" checked={showSmallPositions} onChange={() => setShowSmallPositions(v=>!v)} /> Show Small Positions (&lt; $30 PnL)</label>
					<label className="label">Tokens per page: {" "}
						<select value={tokensPerPage} onChange={(e)=> setTokensPerPage(Number(e.target.value))}>
							{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
						</select>
					</label>
				</div>
				<button className="btn primary" onClick={onSave}>Save</button>
			</div>
		</Layout>
	);
};

export default Settings;

export const Head = () => <Seo title="Settings" />;