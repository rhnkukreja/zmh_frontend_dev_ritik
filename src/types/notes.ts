export interface FolderData {
  id: number;
  folder: string;
  notes_count: number;
  user: number;
  created_by: string;
  date_created: string;
  date_updated: string;
}

export interface NewFolder {
  folder: string;
}

export interface Note {
  id: number;
  name: string;
  text: string;
  folder: number;
  folder_name: string;
  created_by: string;
  date_created: string;
  date_updated: string;
}
export interface Group {
  company_id:number;
  institution_id:number;
  companyName:string |null;
  institutionName:string | null;
  name: string;
  data: Array<any>
  
}

export interface InstitutionOrCompanyData {
  id: number;
  attendees: string;
  notes: string;
  date: string;
  author: string;
  category: string;
  investor_name: string;
  company: number;
  institution: number;
  company_name: string;
  institution_name: string;
  created_by_email: string;
  created_by: number;
  updated_by: number | null;
  date_created: string;
  date_updated: string;
  update_delete_check: boolean;
  formatted_date: string;
  starred: boolean;
  notes_count?: number;
};


