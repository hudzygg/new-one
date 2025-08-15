const { isValidEthAddress, fetchPerToken } = require('./utils');

exports.handler = async (event) => {
	try {
		const params = new URLSearchParams(event.queryStringParameters || {});
		const address = String(params.get('address') || '').toLowerCase();
		if (!isValidEthAddress(address)) return { statusCode: 400, body: JSON.stringify({ error: 'Invalid address' }) };
		const data = await fetchPerToken(address);
		return { statusCode: 200, body: JSON.stringify(data) };
	} catch (e) {
		return { statusCode: 500, body: JSON.stringify({ error: e.message || 'Internal error' }) };
	}
};