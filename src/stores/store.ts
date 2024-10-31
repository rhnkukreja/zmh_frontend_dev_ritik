import {
  configureStore,
  ThunkAction,
  Action,
  combineReducers,
  Reducer,
} from "@reduxjs/toolkit";
import darkModeReducer from "./darkModeSlice";
import colorSchemeReducer from "./colorSchemeSlice";
import sideMenuReducer from "./sideMenuSlice";
import themeReducer from "./themeSlice";
import compactMenuReducer from "./compactMenuSlice";
import pageLoaderReducer from "./pageLoaderSlice";
import authenticationReducer from "./authenticationSlice";
import engagementQuestionsReducer from "./engagementQuestionSlice";
import investersProfileReducer from "./investersProfileSlice";
import proxyVotingGuidelineReducer from "./proxyVotingGuidelineSlice";
import institutionsReducer from "./institutionSlice";
import companyReducer from "./companySlice";
import dashboardReducer from "./dashboardSlice";
import shareholderNoActionReducer from "./shareholderProposalSlice";
import caseStudiesReducer from "./caseStudySlice";
import peerAnalysisReducer from "./peerAnalysisSlice";
import userDetailReducer from "./userDetailSlice";


import { PersistPartial } from "redux-persist/es/persistReducer";
import storage from "redux-persist/lib/storage";
import { persistReducer, persistStore, PURGE } from "redux-persist";

type SliceState = {
  [key: string]: any;
};

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["authentiction"],
};

const slices = {
  darkMode: darkModeReducer,
  colorScheme: colorSchemeReducer,
  sideMenu: sideMenuReducer,
  theme: themeReducer,
  compactMenu: compactMenuReducer,
  pageLoader: pageLoaderReducer,
  authentiction: authenticationReducer,
  engagementQuestions: engagementQuestionsReducer,
  investersProfile: investersProfileReducer,
  proxyVotingGuideline: proxyVotingGuidelineReducer,
  institutions: institutionsReducer,
  company: companyReducer,
  dashboard: dashboardReducer,
  sharedHolderNoAction: shareholderNoActionReducer,
  caseStudies: caseStudiesReducer,
  peerAnalysis: peerAnalysisReducer,
  userDetail: userDetailReducer
};
const appReducer = combineReducers(
  Object.entries(slices).reduce(
    (acc: { [key: string]: Reducer }, [key, slice]) => {
      acc[key] = slice.reducer;
      return acc;
    },
    {}
  )
);

const rootReducer = (
  state: ReturnType<typeof appReducer> | undefined,
  action: any
): ReturnType<typeof appReducer> => {
  if (action.type === PURGE) {
    const obj: SliceState = {};
    Object.entries(slices).forEach(([key, slice]) => {
      try {
        obj[key] = slice.getInitialState();
      } catch (error) {
        console.log("error: ", error);
      }
    });
    return obj as ReturnType<typeof appReducer>;
  }
  return appReducer(state, action);
};
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  devTools: true,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof appReducer> & PersistPartial;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
