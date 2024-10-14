export type ShareHolderDropdown = {
  institution: string[];
  year: string[];
  proponent: string[];
  category: string[];
  sub_category: string[];
  status: string[];
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
  id: number;
  engagement_priorities: string;
  voting_guidelines_summary: string;
  voting_guidelines_link: string;
  reporting_expectations: string;
  esg_integration_process: string;
  references: string;
  active: string;
  key_contacts?: any;
  institution?: string;
};