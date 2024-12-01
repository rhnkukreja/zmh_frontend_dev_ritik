import { NewFolder, FolderData, Note } from "@/types/notes";
import { axiosInstance } from "../index";

class NotesService {
  public async addNewFolder(data: Partial<NewFolder>): Promise<{
    results: FolderData;
  }> {
    const response = await axiosInstance.post(`/user/folder/`, data);
    const results = response.data;
    return {
      results,
    };
  }

  public async updateFolder(
    id: number,
    data: Partial<NewFolder>
  ): Promise<{
    results: FolderData;
  }> {
    const response = await axiosInstance.put(`/user/folder/${id}/`, data);
    const results = response.data;
    return {
      results,
    };
  }

  public async getAllFolders(): Promise<{
    count: number;
    results: FolderData[];
  }> {
    const response = await axiosInstance.get(`/user/folder/`);

    return {
      count: response.data?.length,
      results: response?.data,
    };
  }
  public async fetchSingleFolder(id: number): Promise<{
    results: FolderData;
  }> {
    const response = await axiosInstance.get(`/user/folder/${id}/`);
    return {
      results: response?.data,
    };
  }

  public async addNewNote(data: Partial<Note>): Promise<{
    results: Note;
  }> {
    const response = await axiosInstance.post(`/user/notes/`, data);
    const results = response.data;
    return {
      results,
    };
  }
  public async updateNote(
    id: number,
    data: Partial<Note>
  ): Promise<{
    results: Note;
  }> {
    const response = await axiosInstance.put(`/user/notes/${id}/`, data);
    const results = response.data;
    return {
      results,
    };
  }

  public async getAllNotes(folderId: number): Promise<{
    count: number;
    results: Note[];
  }> {
    const url = `/user/notes/?folder=${folderId}`;
    const response = await axiosInstance.get(url);
    return {
      count: response.data?.length,
      results: response?.data,
    };
  }

  public async getSingleNote(): Promise<{
    results: any;
  }> {
    const response = await axiosInstance.get(`/investor_profile/`);
    const results = response.data;
    return {
      results,
    };
  }
}

export const notesService = new NotesService();
