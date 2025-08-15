const { isValidEthAddress, scanAlphaBuyers } = require('./utils');

exports.handler = async (event) => {
	try {
		const params = new URLSearchParams(event.queryStringParameters || {});
		const token = String(params.get('token') || '').toLowerCase();
		const offset = Number(params.get('offset') || 0);
		if (!isValidEthAddress(token)) return { statusCode: 400, body: JSON.stringify({ error: 'Invalid token address' }) };
		const data = await scanAlphaBuyers(token, offset);
		return { statusCode: 200, body: JSON.stringify(data) };
	} catch (e) {
		return { statusCode: 500, body: JSON.stringify({ error: e.message || 'Internal error' }) };
	}
};