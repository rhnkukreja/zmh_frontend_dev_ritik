import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { notificationsService } from "@/services/notifications";

const name = "globalNotifications";

interface NotificationType {
  id: number;
  title?: string;
  text?: string;
  end_date?: string | null;
  active?: boolean;
  [key: string]: any;
}

interface GlobalNotificationsState {
  notifications: NotificationType[];
  loading: boolean;
  initialized: boolean;
  error: string | null;
}

const initialState: GlobalNotificationsState = {
  notifications: [],
  loading: false,
  initialized: false,
  error: null,
};

const normalizeNotification = (n: any) => ({
  ...n,
  // normalize backend `is_active` to frontend `active`
  active: n.is_active ?? n.active ?? false,
});

export const fetchNotifications = createAsyncThunk(
  `${name}/fetchNotifications`,
  async () => {
    return await notificationsService.getAll();
  }
);

export const fetchNotificationsOnce = createAsyncThunk(
  `${name}/fetchNotificationsOnce`,
  async () => {
    return await notificationsService.getAll();
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as { globalNotifications?: GlobalNotificationsState };
      const slice = state.globalNotifications;
      return !slice?.initialized && !slice?.loading;
    },
  }
);

export const createNotification = createAsyncThunk(
  `${name}/createNotification`,
  async (data: any) => {
    return await notificationsService.create(data);
  }
);

export const updateNotification = createAsyncThunk(
  `${name}/updateNotification`,
  async ({ id, data }: { id: number; data: any }) => {
    return await notificationsService.update(id, data);
  }
);

export const patchNotification = createAsyncThunk(
  `${name}/patchNotification`,
  async ({ id, data }: { id: number; data: any }) => {
    return await notificationsService.patch(id, data);
  }
);

export const deleteNotification = createAsyncThunk(
  `${name}/deleteNotification`,
  async (id: number) => {
    return await notificationsService.delete(id);
  }
);

const slice = createSlice({
  name,
  initialState,
  reducers: {
    clearNotifications(state) {
      state.notifications = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.initialized = true;
        const raw = action.payload.results || action.payload || [];
        state.notifications = raw.map(normalizeNotification);
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.initialized = true;
        state.error = action.error.message || "Failed to fetch notifications";
      })

      .addCase(createNotification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createNotification.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        // prepend new notification (normalized)
        if (action.payload) {
          const n = normalizeNotification(action.payload);
          state.notifications.unshift(n);
        }
      })
      .addCase(createNotification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to create notification";
      })

      .addCase(updateNotification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateNotification.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        const updatedRaw = action.payload;
        const updated = normalizeNotification(updatedRaw);
        const idx = state.notifications.findIndex((n) => n.id === updated.id);
        if (idx !== -1) state.notifications[idx] = updated;
      })
      .addCase(updateNotification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to update notification";
      })

      .addCase(patchNotification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(patchNotification.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        const updatedRaw = action.payload;
        const updated = normalizeNotification(updatedRaw);
        const idx = state.notifications.findIndex((n) => n.id === updated.id);
        if (idx !== -1) state.notifications[idx] = updated;
      })
      .addCase(patchNotification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to patch notification";
      })

      .addCase(deleteNotification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteNotification.fulfilled, (state, action: any) => {
        state.loading = false;
        const id = action.meta.arg;
        state.notifications = state.notifications.filter((n) => n.id !== id);
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to delete notification";
      });
  },
});

export default slice;
export const { clearNotifications } = slice.actions;
