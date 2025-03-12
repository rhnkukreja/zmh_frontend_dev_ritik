import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { notesService } from "@/services/notes";
import { FolderData, NewFolder, Note } from "@/types/notes";
import { getPageNumbers } from "@/utils/helper";

const name = "notes";

interface NotesSliceState {
  folders: FolderData[];
  totalFoldersCount: number;
  totalFolderPages: number;
  notes: Note[];
  selectedFolder: FolderData | null;
  totalNotesCount: number;
  totalNotesPages: number;
  selectedNote: Note | null;
  loading: boolean;
  notesLoading: boolean;
  error: string | null;
}

const initialState: NotesSliceState = {
  folders: [],
  totalFoldersCount: 0,
  totalFolderPages: 0,
  selectedFolder: null,
  notes: [],
  totalNotesCount: 0,
  totalNotesPages: 0,
  selectedNote: null,
  loading: false,
  error: null,
  notesLoading: false,
};

// Async thunks

export const addNewFolder = createAsyncThunk<
  { results: FolderData; isEdit: boolean },
  { id?: number; data: Partial<NewFolder> }
>(`${name}/addNewFolder`, async ({ data, id }) => {
  let response;
  if (id) {
    response = await notesService.updateFolder(id, data);
  } else {
    response = await notesService.addNewFolder(data);
  }
  return { results: response.results, isEdit: !!id };
});

export const fetchFolders = createAsyncThunk<{
  count: number;
  results: FolderData[];
}>(`${name}/fetchFolders`, async () => {
  const response = await notesService.getAllFolders();
  return response;
});

export const fetchSingleFolder = createAsyncThunk<
  {
    results: FolderData;
  },
  number
>(`${name}/fetchSingleFolder`, async (id) => {
  const response = await notesService.fetchSingleFolder(id);
  return response;
});

export const deleteFolder = createAsyncThunk<any, number>(
  `${name}/deleteFolder`,
  async (id) => {
    const response = await notesService.deleteFolder(id);
    return {
      response,
      id: id,
    };
  }
);

export const addNote = createAsyncThunk<
  { results: Note; isEdit: boolean },
  { id?: number; data: Partial<Note> }
>(`${name}/addNote`, async ({ data, id }) => {
  let response;
  if (id) {
    response = await notesService.updateNote(id, data);
  } else {
    response = await notesService.addNewNote(data);
  }
  return { results: response.results, isEdit: !!id };
});

export const fetchNotes = createAsyncThunk<
  {
    count: number;
    results: Note[];
  },
  number
>(`${name}/fetchNotes`, async (folderId: number) => {
  const response = await notesService.getAllNotes(folderId);
  return response;
});

export const deleteNote = createAsyncThunk<any, number>(
  `${name}/deleteNote`,
  async (id) => {
    const response = await notesService.deleteNote(id);
    return {
      response,
      id: id,
    };
  }
);

export const fetchSingleNote = createAsyncThunk<Note, number>(
  `${name}/fetchSingleNote`,
  async (id: number) => {
    const response = await notesService.getSingleNote(id);
    return response.results.find((note: Note) => note.id === id);
  }
);

const notesSlice = createSlice({
  name,
  initialState,
  reducers: {
    setSelectedFolder(state, action: PayloadAction<FolderData | null>) {
      state.selectedFolder = action.payload;
    },
    clearSelectedFolder(state) {
      state.selectedFolder = null;
    },

    setSelectedNote(state, action: PayloadAction<Note | null>) {
      state.selectedNote = action.payload;
    },
    clearSelectedNote(state) {
      state.selectedNote = null;
    },

    removeAllNotes(state) {
      state.notes = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(addNewFolder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addNewFolder.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.isEdit) {
          const index = state.folders.findIndex(
            (folder) => folder.id === action.payload.results.id
          );
          if (index !== -1) {
            state.folders[index] = action.payload.results;
            if (state.selectedFolder?.id === action.payload.results.id) {
              state.selectedFolder = action.payload.results;
            }
          }
        } else {
          state.folders.unshift(action.payload.results);
          state.selectedFolder = action.payload.results;
        }
      })
      .addCase(addNewFolder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch folders";
      })

      .addCase(fetchFolders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(
        fetchFolders.fulfilled,
        (
          state,
          action: PayloadAction<{
            count: number;
            results: FolderData[];
          }>
        ) => {
          state.loading = false;
          state.folders = action.payload.results?.slice()?.reverse();
          state.totalFoldersCount = action.payload.count;
          state.totalFolderPages = getPageNumbers(action.payload.count);

          if (action.payload.results && action.payload.results.length > 0) {
            const updatedFolderIndex = action.payload.results.findIndex(
              (folder) => folder.id === state.selectedFolder?.id
            );

            if (updatedFolderIndex !== -1) {
              state.selectedFolder = action.payload.results[updatedFolderIndex];
            }

            // else {
            //   state.selectedFolder = action.payload.results
            //     ?.slice()
            //     ?.reverse()?.[0];
            // }
          }
        }
      )
      .addCase(fetchFolders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch folders";
      })

      .addCase(fetchSingleFolder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(
        fetchSingleFolder.fulfilled,
        (
          state,
          action: PayloadAction<{
            results: FolderData;
          }>
        ) => {
          state.loading = false;
          state.selectedFolder = action.payload.results;

          const index = state.folders.findIndex(
            (folder) => folder.id === action.payload.results.id
          );
          if (index !== -1) {
            state.folders[index] = action.payload.results;
          }
        }
      )
      .addCase(fetchSingleFolder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch folders";
      })

      .addCase(deleteFolder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteFolder.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.id === state.selectedFolder?.id) {
          state.selectedFolder = null;
        }
      })
      .addCase(deleteFolder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch note";
      })

      .addCase(fetchNotes.pending, (state) => {
        state.notesLoading = true;
        state.error = null;
      })
      .addCase(fetchNotes.fulfilled, (state, action) => {
        state.notesLoading = false;
        state.notes = action.payload.results.slice().reverse();
        state.selectedNote = action.payload.results?.slice().reverse()?.[0];
        state.totalNotesCount = action.payload.count;
        state.totalNotesPages = getPageNumbers(action.payload.count);
      })
      .addCase(fetchNotes.rejected, (state, action) => {
        state.notesLoading = false;
        state.error = action.error.message || "Failed to fetch notes";
      })

      .addCase(fetchSingleNote.pending, (state) => {
        state.notesLoading = true;
        state.error = null;
      })
      .addCase(
        fetchSingleNote.fulfilled,
        (state, action: PayloadAction<Note>) => {
          state.notesLoading = false;
          state.selectedNote = action.payload;
        }
      )
      .addCase(fetchSingleNote.rejected, (state, action) => {
        state.notesLoading = false;
        state.error = action.error.message || "Failed to fetch note";
      })

      .addCase(addNote.pending, (state) => {
        state.notesLoading = true;
        state.error = null;
      })
      .addCase(addNote.fulfilled, (state, action) => {
        state.notesLoading = false;
        if (action.payload.isEdit) {
          const index = state.notes.findIndex(
            (note) => note?.id === action.payload?.results?.id
          );
          if (index !== -1) {
            state.notes[index] = action.payload.results;
            state.selectedNote = action.payload.results;
          }
        } else {
          state.notes.unshift(action.payload.results);
          state.selectedNote = action.payload.results;
        }
      })
      .addCase(addNote.rejected, (state, action) => {
        state.notesLoading = false;
        state.error = action.error.message || "Failed to add note";
      })

      .addCase(deleteNote.pending, (state) => {
        state.notesLoading = true;
        state.error = null;
      })
      .addCase(deleteNote.fulfilled, (state, action) => {
        state.notesLoading = false;

        if (action.payload?.id === state.selectedNote?.id) {
          state.selectedNote = null;
        }
      })
      .addCase(deleteNote.rejected, (state, action) => {
        state.notesLoading = false;
        state.error = action.error.message || "Failed to fetch note";
      });
  },
});

export default notesSlice;
export const {
  clearSelectedFolder,
  setSelectedFolder,
  setSelectedNote,
  clearSelectedNote,
  removeAllNotes,
} = notesSlice.actions;
