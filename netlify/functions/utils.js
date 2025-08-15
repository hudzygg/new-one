const axios = require('axios');

const SYVE_API_KEY = process.env.SYVE_API_KEY || '';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';

const EXCLUDED_SYMBOLS = new Set([
	'BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'USDC', 'XRP', 'TON', 'DOGE', 'ADA', 'TRX', 'AVAX', 'SHIB', 'WBTC', 'DOT', 'LINK', 'BCH', 'NEAR', 'UNI', 'LTC', 'DAI', 'FDUSD'
]);

const MAX_REASONABLE_VALUE = 1e6;
const FRESH_WALLET_TRADE_THRESHOLD = 5;

function isValidEthAddress(address) {
	return typeof address === 'string' && address.startsWith('0x') && address.length === 42;
}

function toPct(value) {
	if (!Number.isFinite(value)) return 0;
	return value * 100;
}

async function fetchSyveLatestPerformancePerToken(walletAddress) {
	const url = 'https://api.syve.ai/v1/wallet-api/latest-performance-per-token';
	const params = {
		wallet_address: walletAddress,
		key: SYVE_API_KEY,
		exclude_unrealized: 'true',
		total_exclude: 'true',
	};
	const { data } = await axios.get(url, { params });
	return data;
}

function filterAndBoundTokens(tokens) {
	return (tokens || []).filter((token) => {
		const symbol = token.token_symbol;
		const hasActivity = (token.total_investment || 0) > 0 || (token.total_buys || 0) > 0;
		const withinBounds = [
			Math.abs(token.total_profit || 0) < MAX_REASONABLE_VALUE,
			Math.abs(token.total_value || 0) < MAX_REASONABLE_VALUE,
			Math.abs(token.realized_profit || 0) < MAX_REASONABLE_VALUE,
			Math.abs(token.unrealized_profit || 0) < MAX_REASONABLE_VALUE,
		].every(Boolean);
		return !EXCLUDED_SYMBOLS.has(symbol) && hasActivity && withinBounds;
	});
}

async function fetchPerformanceSummary(walletAddress) {
	const raw = await fetchSyveLatestPerformancePerToken(walletAddress);
	const tokens = filterAndBoundTokens(raw.data || []);
	if (!tokens.length) return null;

	const totalInvestment = tokens.reduce((s, t) => s + (t.total_investment || 0), 0);
	const totalProfit = tokens.reduce((s, t) => s + (t.total_profit || 0), 0);
	const totalValue = tokens.reduce((s, t) => s + (t.total_value || 0), 0);
	const realizedProfit = tokens.reduce((s, t) => s + (t.realized_profit || 0), 0);
	const realizedValue = tokens.reduce((s, t) => s + (t.realized_value || 0), 0);
	const realizedInvestment = tokens.reduce((s, t) => s + (t.realized_investment || 0), 0);
	const unrealizedProfit = tokens.reduce((s, t) => s + (t.unrealized_profit || 0), 0);
	const unrealizedValue = tokens.reduce((s, t) => s + (t.unrealized_value || 0), 0);
	const unrealizedInvestment = tokens.reduce((s, t) => s + (t.unrealized_investment || 0), 0);
	const totalTrades = tokens.reduce((s, t) => s + (t.total_trades || 0), 0);
	const totalBuys = tokens.reduce((s, t) => s + (t.total_buys || 0), 0);
	const totalSells = tokens.reduce((s, t) => s + (t.total_sells || 0), 0);
	const totalBuyVolume = tokens.reduce((s, t) => s + (t.total_buy_volume || 0), 0);
	const totalSellVolume = tokens.reduce((s, t) => s + (t.total_sell_volume || 0), 0);
	const totalTokensTraded = tokens.length;
	const successCount = tokens.filter((t) => (t.total_profit || 0) > 0).length;
	const winRate = totalTokensTraded > 0 ? successCount / totalTokensTraded : 0;
	const firstTs = tokens.map((t) => t.first_trade_timestamp).filter(Boolean);
	const lastTs = tokens.map((t) => t.last_trade_timestamp).filter(Boolean);

	return {
		wallet_address: walletAddress,
		pnl: totalProfit,
		total_profit: totalProfit,
		total_value: totalValue,
		total_investment: totalInvestment,
		total_return: totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0,
		realized_profit: realizedProfit,
		realized_value: realizedValue,
		realized_investment: realizedInvestment,
		realized_return: totalInvestment > 0 ? (realizedProfit / totalInvestment) * 100 : 0,
		unrealized_profit: unrealizedProfit,
		unrealized_value: unrealizedValue,
		unrealized_investment: unrealizedInvestment,
		unrealized_return: totalInvestment > 0 ? (unrealizedProfit / totalInvestment) * 100 : 0,
		total_trades: totalTrades,
		total_buys: totalBuys,
		total_sells: totalSells,
		total_buy_volume: totalBuyVolume,
		total_sell_volume: totalSellVolume,
		total_tokens_traded: totalTokensTraded,
		win_rate: winRate,
		first_trade_timestamp: firstTs.length ? Math.min(...firstTs) : null,
		last_trade_timestamp: lastTs.length ? Math.max(...lastTs) : null,
	};
}

async function fetchPerToken(walletAddress) {
	const raw = await fetchSyveLatestPerformancePerToken(walletAddress);
	const tokens = filterAndBoundTokens(raw.data || []);
	return { data: tokens };
}

async function isContract(address) {
	try {
		const url = 'https://api.etherscan.io/api';
		const params = {
			module: 'contract',
			action: 'getsourcecode',
			address,
			apikey: ETHERSCAN_API_KEY,
		};
		const { data } = await axios.get(url, { params });
		return data.status === '1' && data.result && data.result[0] && data.result[0].SourceCode;
	} catch (e) {
		return false;
	}
}

async function getMainEthPairAddress(tokenAddress) {
	const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;
	const { data } = await axios.get(url);
	if (!data || !Array.isArray(data.pairs) || data.pairs.length === 0) {
		return { pairAddress: null, tokenSymbol: null, tokenName: null };
	}
	const ethPairs = data.pairs.filter((p) => p.chainId === 'ethereum');
	if (!ethPairs.length) {
		return { pairAddress: null, tokenSymbol: null, tokenName: null };
	}
	ethPairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
	const pair = ethPairs[0];
	const pairAddress = pair.pairAddress?.toLowerCase();
	let tokenSymbol, tokenName;
	if (pair.baseToken?.address?.toLowerCase() === tokenAddress.toLowerCase()) {
		tokenSymbol = pair.baseToken.symbol;
		tokenName = pair.baseToken.name || 'Unknown';
	} else {
		tokenSymbol = pair.quoteToken?.symbol;
		tokenName = pair.quoteToken?.name || 'Unknown';
	}
	return { pairAddress, tokenSymbol, tokenName };
}

async function fetchTokenTransfers(tokenAddress) {
	const url = 'https://api.etherscan.io/api';
	const params = {
		module: 'account',
		action: 'tokentx',
		contractaddress: tokenAddress,
		page: 1,
		offset: 200,
		sort: 'asc',
		apikey: ETHERSCAN_API_KEY,
	};
	const { data } = await axios.get(url, { params });
	if (data.status !== '1') {
		const message = data.message || 'Unknown error';
		throw new Error(`Etherscan error: ${message}`);
	}
	return data.result || [];
}

async function scanAlphaBuyers(tokenAddress, offset = 0) {
	const { pairAddress, tokenSymbol, tokenName } = await getMainEthPairAddress(tokenAddress);
	if (!pairAddress) {
		return { tokenSymbol, tokenName, wallets: [], nextOffset: offset };
	}
	const transfers = await fetchTokenTransfers(tokenAddress);
	const buyWallets = [];
	const seen = new Set();
	for (const tx of transfers) {
		if ((tx.from || '').toLowerCase() === pairAddress) {
			const toAddr = (tx.to || '').toLowerCase();
			if (!seen.has(toAddr)) {
				seen.add(toAddr);
				const contractCheck = await isContract(toAddr);
				if (!contractCheck) {
					buyWallets.push(toAddr);
					if (buyWallets.length === 200) break;
				}
			}
		}
	}

	const start = Math.max(0, Number(offset) || 0);
	const end = Math.min(start + 10, buyWallets.length);
	const slice = buyWallets.slice(start, end);
	const results = [];
	for (const wallet of slice) {
		try {
			const summary = await fetchPerformanceSummary(wallet);
			if (!summary) continue;
			const totalTrades = summary.total_trades || 0;
			if (totalTrades < FRESH_WALLET_TRADE_THRESHOLD) continue;
			const winRatePct = toPct(summary.win_rate);
			const totalProfit = summary.total_profit || 0;
			const isAlpha = (summary.win_rate >= 0.5) && (totalProfit > 1000) && (totalTrades >= 20);
			results.push({ wallet, isAlpha, winRate: winRatePct });
		} catch (_) {}
	}
	return { tokenSymbol, tokenName, wallets: results, nextOffset: end, hasMore: end < buyWallets.length };
}

module.exports = {
	isValidEthAddress,
	fetchPerformanceSummary,
	fetchPerToken,
	scanAlphaBuyers,
};