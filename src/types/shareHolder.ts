export type ShareHolderDropdown = {
  institution?: string[];
  year: string[];
  proponent?: string[];
  category: string[];
  sub_category: string[];
  status: string[];
  company?: string[];
};

export type ShareHolderData = {
  id?: number;
  def14a_id?: string;
  company_name?: string;
  company_ticker?: string;
  company_sector?: string;
  proponent_name?: string;
  year?: number;
  link_to_2023_filing?: string;
  category?: string;
  sub_category?: string;
  proposal_text?: string;
  proposal_name?: string;
  nl_exist?: string;
  proposal_num?: number;
  company?: number;
  institution?: number;
  outcome_percentage?: string;
  no_action_link?: string;
};


export type AddShareholderType = {
  id: string;
  proponent: string;
  category: string;
  sub_category: string;
  year:string;
  company: any;
  status: boolean;
  proposal_text: string;
  proposal_name: string;
  nl_exist: string;
  proposal_num: string;
  institution: string;
  company_name?:string;
  // adminStatus: boolean;
  actual_proponent_name: string;
  percentage_support: string;
  vote_outcome_formula: string;
  no_shareholder_proposal:boolean;
};


export type AddWithdrawnType = {
  id: string;
  initiative: string;
  proponent: string;
  proponent_name: string;
  year:string;
  company: any;
  status: string;
  nl_exist: string;
  company_name?:string;
  withdrawal_reason: string;
  institution: string;
};


export type AddNoActionType = {
  id: string;
  proponent: string;
  bases_asserted_for_exclusion: string;
  proponent_name: string;
  // staff_response: string;
  link_to_staff_response: string;
  link_to_initial_submission: string;
  category: string;
  sub_category: string;
  year:string;
  company: any;
  status: string;
  proposal_text: string;
  nl_exist: string;
  proposal_num: string;
  actual_proponent_name: string;
  staff_response: string;
  withdrawn: boolean;
  company_name?:string;
  vote_outcome_formula: string;
  institution: string;
};