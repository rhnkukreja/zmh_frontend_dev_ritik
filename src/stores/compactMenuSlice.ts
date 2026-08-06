import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./store";

interface CompactMenuState {
  value: boolean;
}

const initialState: CompactMenuState = {
  value: false,
};

export const compactMenuSlice = createSlice({
  name: "compactMenu",
  initialState,
  reducers: {
    setCompactMenu: (state, action: PayloadAction<boolean>) => {
      state.value = action.payload;
    },
  },
});

export const { setCompactMenu } = compactMenuSlice.actions;

export const selectCompactMenu = (state: RootState) => state.compactMenu.value;

export default compactMenuSlice;
