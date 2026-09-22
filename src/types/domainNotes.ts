export interface DomainNote {
  id: number;
  attendees: string;
  author: string;
  category: string;
  company: number;
  company_id?: number;
  company_name: string;
  created_by: number;
  created_by_email: string;
  created_by_name?: string | null;
  date: string;
  date_created: string;
  date_updated: string;
  formatted_date: string;
  institution: number;
  institution_id?: number;
  institution_name: string;
  investor_name: string;
  notes: string;
  shared?: boolean;
  starred: boolean;
  comments: DomainNoteComment[];
  comments_check?: boolean | number | string;
  update_delete_check: boolean;
  updated_by: string | null;
}

export interface DomainNoteComment {
  id?: number;
  name?: string;
  created_by_name?: string | null;
  comments: any;
  domain_notes: number;
  update_delete_check?: boolean | number | string;
  date?: string;
}

export interface InstitutionHierarchyItem {
  main_heading: string;
  sub_heading: {
    [companyName: string]: DomainNote[];
  };
}

export interface CompanyHierarchyItem {
  main_heading: string;
  sub_heading: {
    [institutionName: string]: DomainNote[];
  };
}
