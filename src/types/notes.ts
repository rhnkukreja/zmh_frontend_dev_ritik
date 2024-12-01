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
