export interface DomainNote {
    id: number;
    attendees: string;
    author: string;
    category: string;
    company: number;
    company_name: string;
    created_by: number;
    created_by_email: string;
    date: string;
    date_created: string;
    date_updated: string;
    formatted_date: string;
    institution: number;
    institution_name: string;
    investor_name: string;
    notes: string;
    starred: boolean;
    update_delete_check: boolean;
    updated_by: string | null;
  }
  