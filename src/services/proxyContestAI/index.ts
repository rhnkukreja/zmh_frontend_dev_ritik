import { axiosInstance } from "../index";

const toJsonParam = (arr: any[]) => JSON.stringify(arr);

// ── Settled / excluded campaigns mode ───────────────────────────────────────
// Default (undefined) = backend default "Exclude". Set to "Include" to show
// settled/excluded campaigns on ALL proxy contest read endpoints.
let settledMode: "Include" | "Exclude" | undefined;
export const setProxyContestSettledMode = (mode: "Include" | "Exclude" | undefined) => {
  settledMode = mode;
};
export const getProxyContestSettledMode = () => settledMode;

const withSettled = (q: string): string => {
  if (!settledMode) return q;
  const param = `settled=${settledMode}`;
  return q ? `${q}&${param}` : `?${param}`;
};

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
    const res = await axiosInstance.get(`/proxy_contest/overview-filters/${withSettled(q)}`);
    return res.data;
  },

  getSummaryFilters: async (year?: string[], institution_id?: number[]) => {
    const q = buildQuery({ year, institution_id });
    const res = await axiosInstance.get(`/proxy_contest/summary-filters/${withSettled(q)}`);
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
    const res = await axiosInstance.get(`/proxy_contest/companies/${withSettled(q)}`);
    return res.data;
  },

  getOverviewSummary: async (filters: {
    year?: string[];
    institution_id?: number[];
    vote?: string[];
    company_id?: number[];
    iss_support?: string;
    gl_support?: string;
    investor_support_activist?: boolean;
    vr_page?: number;
    vr_page_size?: number;
  }) => {
    const q = buildQuery(filters);
    const res = await axiosInstance.get(`/proxy_contest/overview-summary/${withSettled(q)}`);
    return res.data;
  },

  // Excel export of ALL voting records matching the current filters.
  // Pagination params (vr_page / vr_page_size) are intentionally never sent.
  downloadVotingRecordsExcel: async (filters: {
    year?: string[];
    institution_id?: number[];
    vote?: string[];
    company_id?: number[];
    iss_support?: string;
    gl_support?: string;
    investor_support_activist?: boolean;
  }): Promise<Blob> => {
    const q = buildQuery({ ...filters, download: "true" });
    const res = await axiosInstance.get(`/proxy_contest/overview-summary/${withSettled(q)}`, {
      responseType: "blob",
    });
    return res.data as Blob;
  },

  getVotingData: async (companyId: number, year: string, institutionId?: number[]) => {
    let q = `?company_id=${companyId}&year=${year}`;
    if (institutionId && institutionId.length > 0)
      q += `&institution_id=${encodeURIComponent(toJsonParam(institutionId))}`;
    const res = await axiosInstance.get(`/proxy_contest/voting-data/${withSettled(q)}`);
    return res.data;
  },

  getActivismTables: async (companyName: string, year?: string[]) => {
    let q = `?company_name=${encodeURIComponent(companyName)}`;
    if (year && year.length > 0)
      q += `&year=${encodeURIComponent(toJsonParam(year))}`;
    const res = await axiosInstance.get(`/proxy_contest/activism_tables/${withSettled(q)}`);
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
    const res = await axiosInstance.get(`/proxy_contest/dropdown/${withSettled("")}`);
    return res.data;
  },

  // ── Settled / excluded campaigns management ────────────────────────────────
  getSettledExclusions: async (params?: {
    company_id?: number;
    year?: number;
    exclude?: boolean;
  }) => {
    const q = buildQuery(params || {});
    const res = await axiosInstance.get(`/proxy_contest/settled-exclusions/${q}`);
    return res.data;
  },

  createSettledExclusion: async (body: {
    company_id: number;
    year?: number;
    exclude: boolean;
    reason?: string;
  }) => {
    const res = await axiosInstance.post(`/proxy_contest/settled-exclusions/`, body);
    return res.data;
  },

  deleteSettledExclusion: async (id: number) => {
    const res = await axiosInstance.delete(`/proxy_contest/settled-exclusions/?id=${id}`);
    return res.data;
  },
};
