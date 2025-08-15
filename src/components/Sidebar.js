import React from "react";
import { Link } from "gatsby";

const Sidebar = () => {
	return (
		<aside className="swiftyy-sidebar glass">
			<div className="sidebar-brand">
				<span className="brand-dot" />
				<span className="brand-text">Swiftyy</span>
			</div>
			<nav className="sidebar-nav">
				<Link activeClassName="active" className="nav-item" to="/dashboard/">
					<span className="nav-emoji">📊</span>
					<span>Dashboard</span>
				</Link>
				<Link activeClassName="active" className="nav-item" to="/alpha-tracker/">
					<span className="nav-emoji">🧠</span>
					<span>AlphaTracker</span>
				</Link>
			</nav>
			<div className="sidebar-footer">
				<a href="https://etherscan.io/" target="_blank" rel="noreferrer" className="ext-link">Etherscan ↗</a>
				<a href="https://dexscreener.com/" target="_blank" rel="noreferrer" className="ext-link">DexScreener ↗</a>
			</div>
		</aside>
	);
};

export default Sidebar;