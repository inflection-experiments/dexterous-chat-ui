import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const userId = params.userId;
	
	try {
		const response = await fetch(`/api/server/conversations?userId=${userId}`);
		const data = await response.json();
		
		return {
			userId,
			conversations: data.conversations || []
		};
	} catch (error) {
		console.error('Error loading conversations:', error);
		return {
			userId,
			conversations: []
		};
	}
};

