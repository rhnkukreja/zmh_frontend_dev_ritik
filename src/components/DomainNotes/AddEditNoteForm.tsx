import React, {
  SetStateAction,
  Dispatch,
  useRef,
  useState,
  useEffect,
} from "react";
import { useForm } from "react-hook-form";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [institutionsSearchTerm, setInstitutionsSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showInsDropdown, setInsShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().split("T")[0];
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
      if (!searchTerm.trim()) return;
      dispatch(fetchDomainNotesDropDownValuesByCompany(searchTerm));
    }, 500);

    return () => clearTimeout(debounce);
  }, [searchTerm, dispatch]);
  useEffect(() => {
    const debounce = setTimeout(() => {
      if (!institutionsSearchTerm.trim()) return;
      dispatch(
        fetchDomainNotesDropDownValuesByInstitution(institutionsSearchTerm)
      );
    }, 500);
    return () => clearTimeout(debounce);
  }, [institutionsSearchTerm, dispatch]);

  const { control, handleSubmit, reset } = useForm<DomainNote>({
    defaultValues:
      mode === "add"
        ? {
            attendees: "",
            notes: "",
            date: today,
            category: "Shareholder Engagement",
            company: data?.company_id || 0,
            institution: data?.institution_id || null,
            investor_name: data?.institution_name || "",
          }
        : {
            attendees: initialData?.attendees || "",
            notes: initialData?.notes || "",
            date: initialData?.date || today,
            category: initialData?.category || "",
            company: data?.company_id || 0,
            institution: data?.institution_id || null,
            investor_name: data?.institution_name || "",
          },
  });
  const fieldsToRender =
    mode === "add" ? ["attendees", "notes", "date", "category"] : fieldsToEdit;
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
      setSelectedData({ ...selectedData, company: id });
    }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="w-full md:w-[47%]">
          <label className="block text-left font-semibold text-gray-800 mb-2">
            Company
          </label>
          {noteModule ? (
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
                <ul className="absolute z-20 bg-white border border-gray-200 rounded-xl shadow-lg md:w-[44%] mt-1 max-h-60 overflow-y-auto transition-all duration-200">
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
        <div className="w-full md:w-[47%]">
          <label className="block text-left font-semibold text-gray-800 mb-2">
            Institution
          </label>
          {noteModule ? (
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
                <ul className="absolute z-20 bg-white border border-gray-200 rounded-xl shadow-lg md:w-[44%] mt-1 max-h-60 overflow-y-auto transition-all duration-200">
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
      <div className="flex flex-wrap gap-4">
        {fieldsToRender.includes("category") && (
          <div className="w-full md:w-[47%]">
            <CategoryField
              control={control}
              rules={{ required: "Category is required" }}
            />
          </div>
        )}
        {fieldsToRender.includes("date") && (
          <div className="w-full md:w-[47%]">
            <DateField
              control={control}
              rules={{ required: "Date is required" }}
            />
          </div>
        )}
      </div>
      {fieldsToRender.includes("attendees") && (
        <NameField
          control={control}
          rules={{ required: "Attendees is required" }}
        />
      )}

      {fieldsToRender.includes("notes") && (
        <NoteField
          control={control}
          rules={{ required: "Note Detail is required" }}
        />
      )}
      <div className="w-full flex justify-end">
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
