const axios = require('axios');

exports.handler = async (event) => {
	try {
		const params = new URLSearchParams(event.queryStringParameters || {});
		const ids = (params.get('ids') || 'bitcoin,ethereum,solana,binancecoin,cardano,toncoin,dogecoin,ripple').toLowerCase();
		const url = 'https://api.coingecko.com/api/v3/coins/markets';
		const query = {
			vs_currency: 'usd',
			ids,
			order: 'market_cap_desc',
			per_page: 50,
			page: 1,
			sparkline: false,
			price_change_percentage: '24h,7d',
		};
		const { data } = await axios.get(url, { params: query, timeout: 10000 });
		return { statusCode: 200, body: JSON.stringify(data) };
	} catch (e) {
		return { statusCode: 500, body: JSON.stringify({ error: e.message || 'Market fetch failed' }) };
	}
};