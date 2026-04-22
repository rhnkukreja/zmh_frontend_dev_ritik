import { axiosInstance } from "../index";

interface ProxyContextDropdownResponse {
	years: string[];
	keywords: string[];
}

interface ProxyContextCompany {
	id: number;
	name: string;
}

interface CompanySearchResponse {
	results: ProxyContextCompany[];
}

interface ProxyAdvisoryPayload {
	company_id: number;
	company_tent: string;
	year: number;
	type: "ISS" | "GL";
	management: boolean;
	activist: boolean;
	split: boolean;
}

class ProxyContextService {
	public async getDropdowns(): Promise<ProxyContextDropdownResponse> {
		const response = await axiosInstance.get("/proxy_contest/dropdowns/");
		return {
			years: response?.data?.years || [],
			keywords: response?.data?.keywords || [],
		};
	}

	public async searchCompanies(query: string): Promise<CompanySearchResponse> {
		let results = [];
		
		if (query?.trim()) {
			const params = new URLSearchParams();
			params.append('company_name', query.trim());
			params.append('all', 'true');
			
			const url = `/company/?${params.toString()}`;
			const response = await axiosInstance.get(url);
			
			// Handle both direct array response and wrapped response
			const data = Array.isArray(response?.data) ? response?.data : (response?.data?.results || []);
			
			results = data
				.map((company: any) => ({
					id: company?.id,
					name: company?.name || company?.company_name || "",
				}))
				.filter((company: ProxyContextCompany) =>
					Boolean(company.id && company.name)
				);
		}
		
		return { results };
	}

	public async createPressReleasePresentation(data: FormData): Promise<any> {
		const response = await axiosInstance.post(
			"/proxy_contest/press_release_presentation/",
			data
		);
		return response.data;
	}

	public async createProxyAdvisoryRecommendation(
		payload: ProxyAdvisoryPayload
	): Promise<any> {
		const response = await axiosInstance.post(
			"/proxy_contest/proxy_advisory_firm_recommendation/",
			payload
		);
		return response.data;
	}
}

export const proxyContextService = new ProxyContextService();