export interface ShareHolderFilter {
  status: string[];
  proponent?: string[];
  category: string[];
  sub_category: string[];
  sector?: string[];
  global_search?: string[];
  year: string[];
  keyword: string[];
  date_range?: string;
  [key: string]: any;
}
