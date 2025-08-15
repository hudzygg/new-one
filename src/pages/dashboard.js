import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/layout";
import Seo from "../components/seo";

const formatNumber = (n) => {
	if (n === null || n === undefined) return "N/A";
	if (typeof n !== "number" || !Number.isFinite(n)) return String(n);
	return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const Dashboard = () => {
	const [coins, setCoins] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [filter, setFilter] = useState("bitcoin,ethereum,solana,binancecoin,cardano,toncoin,dogecoin,ripple");

	useEffect(() => {
		const fetchMarket = async () => {
			setLoading(true);
			setError("");
			try {
				const res = await fetch(`/api/market?ids=${encodeURIComponent(filter)}`);
				const data = await res.json();
				if (!res.ok) throw new Error(data.error || 'Failed to fetch market');
				setCoins(Array.isArray(data) ? data : []);
			} catch (e) {
				setError(e.message);
			} finally {
				setLoading(false);
			}
		};
		fetchMarket();
	}, [filter]);

	const top = useMemo(() => coins.slice(0, 12), [coins]);

	return (
		<Layout>
			<Seo title="Dashboard" />
			<div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
				<h1 style={{ margin: 0 }}>Market Dashboard</h1>
				<div className="tabs">
					<button className="tab active">Overview</button>
					<button className="tab" onClick={() => window.location.href = '/alpha-tracker/'}>AlphaTracker</button>
				</div>
			</div>

			<div className="card" style={{ marginBottom: 12 }}>
				<div className="row">
					<input className="input" type="text" placeholder="comma-separated ids e.g. bitcoin,ethereum,solana" value={filter} onChange={(e)=> setFilter(e.target.value)} />
					<button className="btn">Refresh</button>
				</div>
				{error && <div className="label" style={{ color: '#fca5a5' }}>{error}</div>}
			</div>

			{loading && <div className="label">Loading market…</div>}

			{!loading && top.length > 0 && (
				<div className="grid cols">
					{top.map((c) => (
						<div key={c.id} className="card">
							<div className="row" style={{ justifyContent: 'space-between' }}>
								<div style={{ fontWeight: 600 }}>{c.name} <span className="label">({c.symbol?.toUpperCase()})</span></div>
								<img src={c.image} alt="logo" width={24} height={24} style={{ borderRadius: 6 }} />
							</div>
							<div className="grid cols">
								<div className="card">Price: ${formatNumber(c.current_price)}</div>
								<div className="card">24h: {formatNumber(c.price_change_percentage_24h)}%</div>
								<div className="card">7d: {formatNumber(c.price_change_percentage_7d_in_currency)}%</div>
								<div className="card">Mkt Cap: ${formatNumber(c.market_cap)}</div>
								<div className="card">Vol 24h: ${formatNumber(c.total_volume)}</div>
							</div>
						</div>
					))}
				</div>
			)}
		</Layout>
	);
};

export default Dashboard;

export const Head = () => <Seo title="Market Dashboard" />;