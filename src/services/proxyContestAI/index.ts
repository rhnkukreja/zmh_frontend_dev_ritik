import { axiosInstance } from "../index";

const toJsonParam = (arr: any[]) => JSON.stringify(arr);

const buildQuery = (params: Record<string, any>): string => {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null) continue;
    if (Array.isArray(val)) {
      if (val.length > 0) parts.push(`${key}=${encodeURIComponent(toJsonParam(val))}`);
    } else if (String(val).trim() !== "") {
      parts.push(`${key}=${encodeURIComponent(String(val))}`);
    }
  }
  return parts.length ? "?" + parts.join("&") : "";
};

export const proxyContestAIService = {
  getOverviewFilters: async (year?: string[]) => {
    const q = year && year.length ? `?year=${encodeURIComponent(toJsonParam(year))}` : "";
    const res = await axiosInstance.get(`/proxy_contest/overview-filters/${q}`);
    return res.data;
  },

  getSummaryFilters: async (year?: string[]) => {
    const q = year && year.length ? `?year=${encodeURIComponent(toJsonParam(year))}` : "";
    const res = await axiosInstance.get(`/proxy_contest/summary-filters/${q}`);
    return res.data;
  },

  getCompanies: async (filters: {
    year?: string[];
    company_name?: string[];
    company_id?: number[];
    institution_id?: number[];
    activist_name?: string[];
    page?: number;
    page_size?: number;
    iss_support?: string;
    gl_support?: string;
  }) => {
    const q = buildQuery(filters);
    const res = await axiosInstance.get(`/proxy_contest/companies/${q}`);
    return res.data;
  },

  getOverviewSummary: async (filters: {
    year?: string[];
    institution_id?: number[];
    vote?: string[];
    company_id?: number[];
    iss_support?: string;
    gl_support?: string;
    vr_page?: number;
    vr_page_size?: number;
  }) => {
    const q = buildQuery(filters);
    const res = await axiosInstance.get(`/proxy_contest/overview-summary/${q}`);
    return res.data;
  },

  getVotingData: async (companyId: number, year: string, institutionId?: number[]) => {
    let q = `?company_id=${companyId}&year=${year}`;
    if (institutionId && institutionId.length > 0)
      q += `&institution_id=${encodeURIComponent(toJsonParam(institutionId))}`;
    const res = await axiosInstance.get(`/proxy_contest/voting-data/${q}`);
    return res.data;
  },

  getActivismTables: async (companyName: string, year?: string[]) => {
    let q = `?company_name=${encodeURIComponent(companyName)}`;
    if (year && year.length > 0)
      q += `&year=${encodeURIComponent(toJsonParam(year))}`;
    const res = await axiosInstance.get(`/proxy_contest/activism_tables/${q}`);
    return res.data;
  },

  getMeetingDetails: async (companyName: string, year: string) => {
    const q = `?company_name=${encodeURIComponent(JSON.stringify([companyName]))}&year=${encodeURIComponent(year)}`;
    const res = await axiosInstance.get(`/voting_report_8k/${q}`);
    return res.data;
  },

  getMeetingDetailsByTicker: async (ticker: string, year: string | number, companyName?: string) => {
    let q: string;
    if (ticker) {
      q = `?ticker=${encodeURIComponent(ticker)}&year=${encodeURIComponent(String(year))}`;
    } else if (companyName) {
      q = `?company_name=${encodeURIComponent(JSON.stringify([companyName]))}&year=${encodeURIComponent(String(year))}`;
    } else {
      q = `?year=${encodeURIComponent(String(year))}`;
    }
    const res = await axiosInstance.get(`/voting_report_8k/${q}`);
    return res.data;
  },

  getDropdown: async () => {
    const res = await axiosInstance.get(`/proxy_contest/dropdown/`);
    return res.data;
  },
};
