import { error } from '@sveltejs/kit';

export const post_ = async (url: string, bodyObj: any) => {
	try {
		const headers = { 'Content-Type': 'application/json' };
		const body = JSON.stringify(bodyObj);

		console.log('Body sent to dexterous service backend', JSON.stringify(bodyObj, null, 2));

		const res = await fetch(url, {
			method: 'POST',
			body,
			headers
		});
		const response = await res.json();
		console.log('Response from dexterous service backend', JSON.stringify(response, null, 2));

		if (!response.ok) {
			console.error(`API Error: ${response.Message || response.statusText}`);
			return response;
		}
		return response;
	} catch (err) {
		console.error(`Fetch Exception: ${err}`);
		throw error(500, { message: 'Internal Server Error' });
	}
};

export const post__ = async (url: string, bodyObj: any, userId?: string) => {
	try {
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		
		// Add x-user-id header if userId is provided
		if (userId) {
			headers['x-user-id'] = userId;
		}
		
		const body = JSON.stringify(bodyObj);

		console.log('Body sent to dexterous service backend', JSON.stringify(bodyObj, null, 2));
		if (userId) {
			console.log('x-user-id header:', userId);
		}

		const res = await fetch(url, {
			method: 'POST',
			body,
			headers
		});
		const response = await res.json();
		console.log('Response from dexterous service backend', JSON.stringify(response, null, 2));

		if (!response.ok) {
			console.error(`API Error: ${response.Message || response.statusText}`);
			return response;
		}
		return response;
	} catch (err) {
		console.error(`Fetch Exception: ${err}`);
		throw error(500, { message: 'Internal Server Error' });
	}
};

export const get_ = async (url: string) => {
	try {
		const headers = { 'Content-Type': 'application/json' };

		console.log('Fetching from dexterous service backend', url);

		const res = await fetch(url, {
			method: 'GET',
			headers
		});
		const response = await res.json();
		console.log('Response from dexterous service backend', JSON.stringify(response, null, 2));

		if (!response.ok) {
			console.error(`API Error: ${response.Message || response.statusText}`);
			return response;
		}
		return response;
	} catch (err) {
		console.error(`Fetch Exception: ${err}`);
		throw error(500, { message: 'Internal Server Error' });
	}
};
