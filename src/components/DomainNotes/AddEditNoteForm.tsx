import React, {
  SetStateAction,
  Dispatch,
  useRef,
  useState,
  useEffect,
} from "react";
import { Controller, useForm } from "react-hook-form";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import { useAppSelector } from "@/stores/hooks";
import NoteField from "./NoteEditor";
import NameField from "./CreateNoteName";
import { CompanyDashboard } from "@/stores/dashboardSlice";
import { DomainNote } from "@/types/domainNotes";
import DateField from "./CreateDate";
import CategoryField from "./CreateCategory";
import FormInput from "../Base/Form/FormInput";
import FormCheck from "@/components/Base/Form/FormCheck";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchDomainNotesDropDownValuesByCompany,
  fetchDomainNotesDropDownValuesByInstitution,
} from "@/stores/domainNotesSlice";

interface NoteFormProps {
  initialData: Partial<DomainNote>;
  onSubmit: (data: DomainNote) => void;
  setAddNoteModalVisible: Dispatch<SetStateAction<boolean>>;
  mode: "add" | "edit";
  fieldsToEdit?: Array<"name" | "text" | "folder">;
  data: CompanyDashboard;
  noteModule: boolean;
  setSelectedData: any;
  selectedData: any;
}

interface SelectedNoteData {
  company: number;
  institution: number;
  investor_name: string;
  company_name?: string;
}

const getCompanyId = (
  note?: Partial<DomainNote>,
  fallback?: Partial<CompanyDashboard>
) => Number(note?.company || note?.company_id || fallback?.company_id || 0);

const getInstitutionId = (
  note?: Partial<DomainNote>,
  fallback?: Partial<CompanyDashboard>
) => Number(note?.institution || note?.institution_id || fallback?.institution_id || 0);

const getInstitutionDisplayName = (
  note?: Partial<DomainNote>,
  fallback?: Partial<CompanyDashboard>
) => note?.institution_name || note?.investor_name || fallback?.institution_name || "";

const NoteForm: React.FC<NoteFormProps> = ({
  initialData,
  onSubmit,
  setAddNoteModalVisible,
  mode,
  fieldsToEdit = ["attendees", "notes", "date", "category"],
  data,
  noteModule,
  setSelectedData,
  selectedData,
}) => {
  const dispatch =
    useDispatch<typeof import("@/stores/store").store.dispatch>();
  const { notesLoading } = useAppSelector((state) => state.notes);
  const { user, companyGlobalSearchId, companyGlobalSearchName } = useAppSelector(
    (state) => state.authentiction
  );
  const isCorporateUser =
    !!user?.user_role &&
    user.user_role.toLowerCase() === "corporate";
  const corporateCompanyId = Number(user?.user_actual_company || user?.company_id);
  const globalCompanyId = Number(companyGlobalSearchId || 0);
  const isGlobalCompanyLocked =
    noteModule && mode === "add" && globalCompanyId > 0 && Boolean(companyGlobalSearchName);
  const isCompanyFieldLocked = isGlobalCompanyLocked || mode === "edit";
  const [searchTerm, setSearchTerm] = useState(
    isGlobalCompanyLocked ? companyGlobalSearchName : ""
  );
  const [institutionsSearchTerm, setInstitutionsSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showInsDropdown, setInsShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().split("T")[0];

  const formatDate = (dateString?: string) => {
    if (!dateString) return today;

    const normalizedDate = String(dateString).trim();
    const datePartMatch = normalizedDate.match(/^(\d{4}-\d{2}-\d{2})/);
    if (datePartMatch) {
      return datePartMatch[1];
    }

    const parsedDate = new Date(normalizedDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return today;
    }

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const day = String(parsedDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const isLoading = useSelector(
    (state: { domainNotes: { loadingCompanyDropdown: boolean } }) =>
      state.domainNotes.loadingCompanyDropdown
  );

  const isInsLoading = useSelector(
    (state: { domainNotes: { loadingInstitutionDropdown: boolean } }) =>
      state.domainNotes.loadingInstitutionDropdown
  );
  const dropdownData = useSelector(
    (state: { domainNotes: { companyDropDown: any } }) =>
      state.domainNotes.companyDropDown
  );
  const companyDropdownData = useSelector(
    (state: { domainNotes: { institutionDropDown: any } }) =>
      state.domainNotes.institutionDropDown
  );
  useEffect(() => {
    const debounce = setTimeout(() => {
      if (isCompanyFieldLocked || !searchTerm.trim()) return;
      dispatch(fetchDomainNotesDropDownValuesByCompany(searchTerm));
    }, 500);

    return () => clearTimeout(debounce);
  }, [searchTerm, dispatch, isCompanyFieldLocked]);
  useEffect(() => {
    const debounce = setTimeout(() => {
      if (!institutionsSearchTerm.trim()) return;
      dispatch(
        fetchDomainNotesDropDownValuesByInstitution(institutionsSearchTerm)
      );
    }, 500);
    return () => clearTimeout(debounce);
  }, [institutionsSearchTerm, dispatch]);

  useEffect(() => {
    if (mode !== "edit" || !initialData) return;

    setSelectedData({
      company:
        isCorporateUser && corporateCompanyId
          ? corporateCompanyId
          : getCompanyId(initialData, data),
      institution: getInstitutionId(initialData, data),
      investor_name: getInstitutionDisplayName(initialData, data),
      company_name: initialData.company_name || data?.company_name || "",
    });
    setSearchTerm(initialData.company_name || data?.company_name || "");
    setInstitutionsSearchTerm(
      initialData.institution_name || initialData.investor_name || data?.institution_name || ""
    );
  }, [
    mode,
    initialData,
    isCorporateUser,
    corporateCompanyId,
    data?.company_id,
    data?.company_name,
    data?.institution_id,
    data?.institution_name,
    setSelectedData,
  ]);

  useEffect(() => {
    if (!isGlobalCompanyLocked) return;

    setSelectedData((prev: SelectedNoteData) => ({
      ...prev,
      company: globalCompanyId,
      company_name: companyGlobalSearchName,
    }));
    setSearchTerm(companyGlobalSearchName);
    setShowDropdown(false);
  }, [
    isGlobalCompanyLocked,
    globalCompanyId,
    companyGlobalSearchName,
    setSelectedData,
  ]);

  useEffect(() => {
    if (!isGlobalCompanyLocked && isCorporateUser && corporateCompanyId) {
      setSelectedData((prev: SelectedNoteData) => ({
        ...prev,
        company: corporateCompanyId,
        company_name: user?.company_name || prev.company_name,
      }));
      setSearchTerm(user?.company_name || searchTerm);
    }
  }, [
    isGlobalCompanyLocked,
    isCorporateUser,
    corporateCompanyId,
    user?.company_name,
    setSelectedData,
  ]);

  const getFormValues = (): Partial<DomainNote> =>
    mode === "add"
      ? {
          attendees_company: "",
          attendees_institution: "",
          notes: "",
          date: today,
          category: "",
          company: isGlobalCompanyLocked
            ? globalCompanyId
            : isCorporateUser && corporateCompanyId
              ? corporateCompanyId
              : data?.company_id || 0,
          institution: data?.institution_id || null,
          investor_name: data?.institution_name || "",
          company_name: isGlobalCompanyLocked
            ? companyGlobalSearchName
            : data?.company_name || "",
          shared: Boolean(initialData?.shared),
          key_notes: initialData?.shared ? initialData?.key_notes || "" : null,
        }
      : {
          attendees_company: initialData?.attendees_company || "",
          attendees_institution: initialData?.attendees_institution || "",
          notes: initialData?.notes || "",
          date: formatDate(initialData?.date),
          category: initialData?.category || "",
          company:
            isCorporateUser && corporateCompanyId
              ? corporateCompanyId
              : getCompanyId(initialData, data),
          institution: getInstitutionId(initialData, data) || null,
          investor_name: getInstitutionDisplayName(initialData, data),
          company_name: initialData?.company_name || data?.company_name || "",
          shared: Boolean(initialData?.shared),
          key_notes: initialData?.shared ? initialData?.key_notes || "" : null,
        };

  const { control, handleSubmit, reset, watch, setValue } = useForm<DomainNote>({
    defaultValues: getFormValues(),
  });

  useEffect(() => {
    reset(getFormValues());
  }, [
    mode,
    initialData,
    data?.company_id,
    data?.company_name,
    data?.institution_id,
    data?.institution_name,
    isGlobalCompanyLocked,
    globalCompanyId,
    companyGlobalSearchName,
    isCorporateUser,
    corporateCompanyId,
    reset,
  ]);

  const fieldsToRender =
    mode === "add" ? ["attendees", "notes", "date", "category"] : fieldsToEdit;
  const canShareNote =
    user?.user_type?.toLowerCase() === "admin" ||
    (mode === "edit" && initialData?.shared === true);
  const isShareNoteEnabled = Boolean(watch("shared"));

  useEffect(() => {
    if (!canShareNote) {
      setValue("shared", false);
      setValue("key_notes", null);
    }
  }, [canShareNote, setValue]);
  const handleSelect = (id: number, name: string, from: string) => {
    if (from === "institution") {
      setInstitutionsSearchTerm(name);
      setInsShowDropdown(false);
      setSelectedData({
        ...selectedData,
        institution: id,
        investor_name: name,
      });
    } else {
      setSearchTerm(name);
      setShowDropdown(false);
      setSelectedData({ ...selectedData, company: id, company_name: name });
    }
  };
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.querySelector(".dropdown");
      if (dropdown && !dropdown.contains(event.target as Node)) {
        setShowDropdown(false);
        setInsShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setShowDropdown]);
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className={`grid grid-cols-1 gap-4 ${!isCorporateUser || isCompanyFieldLocked ? "md:grid-cols-2" : ""}`}>
        {(!isCorporateUser || isCompanyFieldLocked) && (
          <div className="relative w-full">
          <label className="block text-left font-semibold text-gray-800 mb-2">
            Company
          </label>
          {isCompanyFieldLocked ? (
            <FormInput
              type="text"
              value={isGlobalCompanyLocked ? companyGlobalSearchName : searchTerm}
              disabled
              className="w-full bg-slate-50 font-medium text-slate-700"
            />
          ) : noteModule ? (
            <>
              <FormInput
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                }}
                placeholder="Search companies"
                required
                className="w-full "
                style={{
                  boxShadow: showDropdown ? "0 0 0 2px #a0143c" : undefined,
                  borderColor: showDropdown ? "#a0143c" : undefined,
                }}
                onFocus={() => {
                  if (searchTerm.trim()) setShowDropdown(true);
                }}
              />
              {showDropdown && (
                <ul className="dropdown absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg transition-all duration-200">
                  {isLoading ? (
                    <li className="px-4 py-2 text-sm text-gray-500">
                      Loading...
                    </li>
                  ) : dropdownData["all_companies"]?.length > 0 ? (
                    dropdownData["all_companies"]?.map(
                      (com: any, idx: number) => (
                        <li
                          key={idx}
                          onClick={() =>
                            handleSelect(com.id, com.name, "company")
                          }
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        >
                          {com.name}
                        </li>
                      )
                    )
                  ) : (
                    <li className="px-4 py-2 text-sm text-gray-500">
                      No results found
                    </li>
                  )}
                </ul>
              )}
            </>
          ) : (
            <FormInput value={data?.company_name} disabled className="w-full" />
          )}
        </div>
        )}
        <div className="relative w-full">
          <label className="block text-left font-semibold text-gray-800 mb-2">
            Institution
          </label>
          {noteModule || mode === "edit" ? (
            <>
              <FormInput
                ref={inputRef}
                type="text"
                value={institutionsSearchTerm}
                onChange={(e) => {
                  setInstitutionsSearchTerm(e.target.value);
                  setInsShowDropdown(true);
                }}
                placeholder="Search institutions"
                className="w-full "
                required
                style={{
                  boxShadow: showInsDropdown ? "0 0 0 2px #a0143c" : undefined,
                  borderColor: showInsDropdown ? "#a0143c" : undefined,
                }}
                onFocus={() => {
                  if (institutionsSearchTerm.trim()) setInsShowDropdown(true);
                }}
              />
              {showInsDropdown && (
                <ul className="dropdown absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg transition-all duration-200">
                  {isInsLoading ? (
                    <li className="px-4 py-2 text-sm text-gray-500">
                      Loading...
                    </li>
                  ) : companyDropdownData["all_institution"]?.length > 0 ? (
                    companyDropdownData["all_institution"].map(
                      (ins: any, idx: number) => (
                        <li
                          key={idx}
                          onClick={() =>
                            handleSelect(ins.id, ins.institution, "institution")
                          }
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        >
                          {ins.institution}
                        </li>
                      )
                    )
                  ) : (
                    <li className="px-4 py-2 text-sm text-gray-500">
                      No results found
                    </li>
                  )}
                </ul>
              )}
            </>
          ) : (
            <FormInput
              value={data?.institution_name}
              disabled
              className="w-full"
            />
          )}
        </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 border-t border-slate-100 pt-3 md:grid-cols-2">
          {fieldsToRender.includes("category") && (
            <CategoryField
              control={control}
              rules={{ required: "Category is required" }}
            />
          )}
          {fieldsToRender.includes("date") && (
            <DateField
              control={control}
              rules={{ required: "Date is required" }}
            />
          )}
        </div>
        {fieldsToRender.includes("attendees") && (
          <div className="mt-3 grid grid-cols-1 gap-4 border-t border-slate-100 pt-3 md:grid-cols-2">
            <NameField
              control={control}
              name="attendees_company"
              label="Attendees (Company)"
              placeholder="Enter company attendees"
            />
            <NameField
              control={control}
              name="attendees_institution"
              label="Attendees (Investor)"
              placeholder="Enter investor attendees"
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
      {fieldsToRender.includes("notes") && (
        <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/40 p-3 shadow-sm">
          <NoteField
            control={control}
            compact
            rules={{ required: "Note Detail is required" }}
          />
        </div>
      )}

      {canShareNote && fieldsToRender.includes("notes") && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/40 p-3 shadow-sm">
          <Controller
            name="shared"
            control={control}
            render={({ field }) => (
              <div>
                <div className="text-sm font-semibold text-slate-800">Share Note</div>
                {/* <div className="mt-1 text-xs leading-5 text-slate-500">
                  If you enable Share Note, only the Key Notes entered below will be shared with everyone. The full note details will not be shared.
                </div> */}
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label
                    htmlFor="share-note-yes"
                    className={`cursor-pointer rounded-lg border px-3 py-2 transition-all ${
                      field.value === true
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                        : "border-slate-200 bg-slate-50/60 hover:border-primary/30 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FormCheck.Input
                        id="share-note-yes"
                        type="radio"
                        checked={field.value === true}
                        onChange={() => field.onChange(true)}
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-800">Share Key Notes</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Enable sharing and make Key Notes required.
                        </div>
                      </div>
                    </div>
                  </label>

                  <label
                    htmlFor="share-note-no"
                    className={`cursor-pointer rounded-lg border px-3 py-2 transition-all ${
                      field.value !== true
                        ? "border-slate-300 bg-white shadow-sm ring-1 ring-slate-200"
                        : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FormCheck.Input
                        id="share-note-no"
                        type="radio"
                        checked={field.value !== true}
                        onChange={() => field.onChange(false)}
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-800">Keep Private</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Do not share this note with everyone.
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}
          />

          {isShareNoteEnabled && (
            <NoteField
              control={control}
              name="key_notes"
              label={
                <>
                  Key Notes{" "}
                  <span className="text-xs font-normal text-slate-500">
                    (Only these Key Notes will be shared with everyone when Share Note is enabled.)
                  </span>
                </>
              }
              compact
              rules={{
                validate: (value) => {
                  if (!isShareNoteEnabled) {
                    return true;
                  }

                  const plainText = String(value || "")
                    .replace(/<[^>]*>/g, " ")
                    .replace(/&nbsp;/gi, " ")
                    .trim();

                  return plainText.length > 0 || "Key Notes is required when Share Note is enabled";
                },
              }}
            />
          )}
        </div>
      )}
      </div>

      {/* <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <Controller
          name="shared"
          control={control}
          render={({ field }) => (
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-800">Share</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">
                  Turn this on to share this note with everyone.
                </div>
              </div>
              <FormSwitch>
                <FormSwitch.Input
                  id="domain-note-shared"
                  type="checkbox"
                  checked={Boolean(field.value)}
                  onChange={(event) => field.onChange(event.target.checked)}
                />
                <FormSwitch.Label htmlFor="domain-note-shared" />
              </FormSwitch>
            </div>
          )}
        />
      </div> */}

      <div className="flex w-full justify-end border-t border-slate-200 pt-2">
        <Button
          type="button"
          variant="outline-secondary"
          onClick={() => {
            reset();
            setAddNoteModalVisible(false);
          }}
          className="w-20 mr-3"
        >
          Cancel
        </Button>

        <Button variant="primary" type="submit">
          {notesLoading && (
            <Lucide
              icon="Loader"
              className={`w-4 h-4 mr-1.5 stroke-[1.3] ${
                notesLoading ? "animate-spin" : ""
              }`}
            />
          )}
          {"Save"}
        </Button>
      </div>
    </form>
  );
};

export default NoteForm;
