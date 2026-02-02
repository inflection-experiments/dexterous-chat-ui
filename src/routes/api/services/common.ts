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

		if (!res.ok) {
			console.error(`API Error: ${res.status} - ${response.Message || res.statusText}`);
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

		if (!res.ok) {
			console.error(`API Error: ${res.status} - ${response.Message || res.statusText}`);
		}
		return response;
	} catch (err) {
		console.error(`Fetch Exception: ${err}`);
		throw error(500, { message: 'Internal Server Error' });
	}
};

export const get_ = async (url: string, extraHeaders?: Record<string, string>) => {
	try {
		const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extraHeaders };

		console.log('Fetching from dexterous service backend', url);

		const res = await fetch(url, {
			method: 'GET',
			headers
		});
		const response = await res.json();
		console.log('Response from dexterous service backend', JSON.stringify(response, null, 2));

		if (!res.ok) {
			console.error(`API Error: ${res.status} - ${response.Message || res.statusText}`);
		}
		return response;
	} catch (err) {
		console.error(`Fetch Exception: ${err}`);
		throw error(500, { message: 'Internal Server Error' });
	}
};

export const delete_ = async (url: string, extraHeaders?: Record<string, string>) => {
	try {
		const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extraHeaders };

		console.log('Deleting from dexterous service backend', url);

		const res = await fetch(url, {
			method: 'DELETE',
			headers
		});

		// Check if response is ok before parsing
		if (!res.ok) {
			const errorText = await res.text();
			let errorData;
			try {
				errorData = JSON.parse(errorText);
			} catch {
				errorData = { message: errorText || res.statusText || 'Failed to delete' };
			}
			console.error(`API Error: ${res.status} - ${errorData.message || errorData.Message || res.statusText}`);
			return {
				Status: 'error',
				status: 'error',
				Message: errorData.message || errorData.Message || 'Failed to delete',
				message: errorData.message || errorData.Message || 'Failed to delete',
				HttpCode: res.status,
				httpCode: res.status
			};
		}

		// Handle empty response (204 No Content)
		if (res.status === 204 || res.headers.get('content-length') === '0') {
			return {
				Status: 'success',
				status: 'success',
				Message: 'Deleted successfully',
				message: 'Deleted successfully'
			};
		}

		// Parse JSON response
		const response = await res.json();
		console.log('Response from dexterous service backend', JSON.stringify(response, null, 2));
		return response;
	} catch (err) {
		console.error(`Fetch Exception: ${err}`);
		// Re-throw SvelteKit errors as-is, wrap others
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, { message: 'Internal Server Error' });
	}
};
