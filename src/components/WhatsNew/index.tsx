import React, { useEffect, useState } from "react";
import { Dialog, Tab } from "../Base/Headless";
import Button from "../Base/Button";
import { FormCheck, FormInput, FormTextarea } from "../Base/Form";
import { Controller, useForm } from "react-hook-form";
import {
  ContactUsAdditionalData,
  HelpFormData,
  InformationType,
  RequestAdditionalData,
} from "@/types/common";
import Error from "../Error";
import { commonService } from "@/services/common";
import { toast } from "react-toastify";
import Lucide from "../Base/Lucide";
import CompanySelect from "../ReactSelectAsync";
import MultiSelectDropdown from "../Base/MultiSelect";
import LoadingIcon from "../Base/LoadingIcon";
import Tippy from "../Base/Tippy";
import { axiosInstance } from "@/services";
import { baseURL } from "@/constant";

interface EmailAlert {
  id: number;
  company_name: string;
  date: string;
  time: string;
  alert_name: string;
  modules: string[];
  schedule: string;
  date_created: string;
  date_updated: string;
  user: number;
  company: number;
  institution: number | null;
}

interface GetHelpProps {
  whatsNewFormVisible: boolean;
  setWhatsNewFormVisible: (value: boolean) => void;
}

const GetWhatsNew = ({
  whatsNewFormVisible,
  setWhatsNewFormVisible,
}: GetHelpProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState<EmailAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [editingAlert, setEditingAlert] = useState<EmailAlert | null>(null);
  const [activeTab, setActiveTab] = useState(0); // 0 for form, 1 for table
  const [institutionOptions, setInstitutionOptions] = useState<any[]>([]);
  const [institutionLoading, setInstitutionLoading] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<any>();

  // Fetch email alerts
  const fetchEmailAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const response = await axiosInstance.get("/notifications/email_alert/");
      setEmailAlerts(response.data.results || []);
    } catch (error) {
      console.error("Error fetching email alerts:", error);
      toast.error("Failed to fetch email alerts");
    } finally {
      setLoadingAlerts(false);
    }
  };

  const fetchInstitutions = async () => {
    setInstitutionLoading(true);
    try {
      let data: any;
      try {
        const res1 = await axiosInstance.get(`${baseURL}/institute/?institution_type=investor&all=true`);
        data = res1.data;
      } catch (e) {
        const res2 = await fetch(`${baseURL}/institute/?institution_type=investor&all=true`);
        data = await res2.json();
      }
      const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      const opts = list
        .map((x: any) => {
          const value = x?.id ?? x?.value ?? x?.pk ?? x?.institute_id ?? x;
          const rawLabel = x?.institution ?? x?.name ?? x?.label ?? x?.institution_name ?? (typeof x === 'string' ? x : (x?.toString ? x.toString() : ''));
          const label = typeof rawLabel === 'string' ? rawLabel : String(rawLabel);
          return { value, label };
        })
        .filter((o: any) => o && o.label);
      setInstitutionOptions(opts);
    } catch (e) {
      setInstitutionOptions([]);
    } finally {
      setInstitutionLoading(false);
    }
  };

  // Delete email alert
  const handleDeleteAlert = async (id: number) => {
    try {
      const response = await axiosInstance.delete(`/notifications/email_alert/${id}/`);
      toast.success("Email alert deleted successfully");
      fetchEmailAlerts(); // Refresh the list
    } catch (error) {
      console.error("Error deleting email alert:", error);
      toast.error("Failed to delete email alert");
    }
  };

  // Update email alert
  const handleUpdateAlert = async (alert: EmailAlert) => {
    setEditingAlert(alert);
    setFormMode('edit');
    // Populate form with existing data
    reset({
      alert_name: alert.alert_name,
      modules: alert.modules,
      schedule: alert.schedule,
      company: [{ value: alert.company, label: alert.company_name }],
      institution: alert.institution ? [{ value: alert.institution, label: String(alert.institution) }] : []
    });
    // Switch to form tab for editing
    setActiveTab(0);
  };

  useEffect(() => {
    if (whatsNewFormVisible) {
      fetchEmailAlerts();
      fetchInstitutions();
      setEditingAlert(null);
      setFormMode('create');
      setActiveTab(0);
      reset({ alert_name: "", modules: [], schedule: "", company: [], institution: [] });
    }
  }, [whatsNewFormVisible]);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      // Format data according to backend requirements
      const formattedData = {
        alert_name: data.alert_name || "",
        modules: data.modules || null,
        schedule: data.schedule || "",
        user: null, // You might want to get this from auth context
        company: Array.isArray(data.company) ? data.company.map((c: any) => c.value) : [],
        institution: Array.isArray(data.institution) ? data.institution.map((i: any) => i.value) : []
      };

      console.log("Sending data to backend:", formattedData);

      let res;
      if (editingAlert) {
        // Update existing alert
        res = await axiosInstance.put(`/notifications/email_alert/${editingAlert.id}/`, formattedData);
        res = res.data;
      } else {
        // Create new alert
        res = await commonService.requestWhatsNew(formattedData);
      }

      if (res.id || res) {
        toast.success(editingAlert ? "Email alert updated successfully" : "Request submitted successfully");
        fetchEmailAlerts(); // Refresh the list
        setEditingAlert(null);
        setActiveTab(1); // Switch to table view to see the results
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
      reset();
    }
  };

  useEffect(() => {
    return () => {
      setIsLoading(false);
      setEditingAlert(null);
    };
  }, []);

  return (
    <>
      <Dialog
        size="xl"
        open={whatsNewFormVisible}
        onClose={() => {
          setWhatsNewFormVisible(false);
          setEditingAlert(null);
          setFormMode('create');
          setActiveTab(0);
          reset();
        }}
      >
        <Dialog.Panel className="text-center">
          <Dialog.Title className="rounded-t-md to-[#000000CC] from-[#9F1239]">
            <h2 className="mr-auto text-md font-semibold">
              {formMode === 'edit' ? "Edit Email Alert" : "Email Alert"}
            </h2>
            {formMode === 'edit' && (
              <button
                onClick={() => {
                  setEditingAlert(null);
                  setFormMode('create');
                  reset({ alert_name: "", modules: [], schedule: "", company: [], institution: [] });
                }}
                className="px-3 py-1 mr-10 rounded-md border border-primary text-primary hover:bg-primary/10"
              >
                Create Alert
              </button>
            )}
            <div
              onClick={() => {
                reset();
                setWhatsNewFormVisible(false);
                setEditingAlert(null);
                setFormMode('create');
                setActiveTab(0);
              }}
              className="absolute top-0 right-0 mt-2 mr-3 cursor-pointer"
            >
              <Lucide icon="X" className="w-6 h-6 text-slate-400" />
            </div>
          </Dialog.Title>
          
          <Dialog.Description className="px-6 py-4">
            {/* Tab Navigation */}
            <Tab.Group selectedIndex={activeTab} onChange={(i) => { setActiveTab(i); if (i === 0) { setEditingAlert(null); setFormMode('create'); } }}>
              <Tab.List className="flex mb-6 gap-2 border-none">
                <Tab>
                  {({ selected }) => (
                    <button
                      className={`px-4 py-2 text-sm font-medium cursor-pointer focus:outline-none rounded-md transition-all ${
                        selected
                          ? 'bg-primary text-white'
                          : 'text-gray-600 border border-primary hover:text-primary hover:bg-primary/10'
                      }`}
                    >
                      {formMode === 'edit' ? "Edit Alert" : "Create Alert"}
                    </button>
                  )}
                </Tab>
                <Tab>
                  {({ selected }) => (
                    <button
                      className={`px-4 py-2 text-sm font-medium cursor-pointer focus:outline-none rounded-md transition-all ${
                        selected
                          ? 'bg-primary text-white'
                          : 'text-gray-600 border border-primary hover:text-primary hover:bg-primary/10'
                      }`}
                    >
                      View All Alerts
                    </button>
                  )}
                </Tab>
              </Tab.List>
              
              <Tab.Panels>
                <Tab.Panel>
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="w-full">
                          <FormCheck.Label className="block text-[0.9rem] font-semibold text-slate-500 mb-2 text-left">
                            Alert Name*
                          </FormCheck.Label>
                          <Controller
                            name="alert_name"
                            control={control}
                            rules={{
                              required: "Alert name is required"
                            }}
                            render={({ field, fieldState: { error } }) => (
                              <>
                                <FormInput
                                  {...field}
                                  type="text"
                                  placeholder="Enter alert name"
                                  className="w-full"
                                />
                                {error && (
                                  <Error className="text-red-600 mt-2">
                                    {error.message}
                                  </Error>
                                )}
                              </>
                            )}
                          />
                        </div>
                        
                        <div className="w-full">
                          <FormCheck.Label className="block text-[0.9rem] font-semibold text-slate-500 mb-2 text-left">
                            Modules*
                          </FormCheck.Label>
                          <div className="grid grid-cols-2 gap-4">
                            <Controller
                              name="modules"
                              control={control}
                              defaultValue={[]}
                              rules={{
                                validate: (v) => (v && v.length > 0) || "Select at least one module",
                              }}
                              render={({ field, fieldState: { error } }) => (
                                <>
                                  {[
                                    "Shareholder Proposals",
                                    "Proxy Voting Guidelines",
                                    "Investor Profile",
                                    "Case Studies",
                                    "Engagement Details",
                                    "Voting Data",
                                  ].map((InfoType, index) => (
                                    <FormCheck key={index} className="mt-2">
                                      <FormCheck.Input
                                        id={`checkbox-switch-${index + 1}`}
                                        type="checkbox"
                                        value={InfoType as InformationType}
                                        checked={field.value.includes(
                                          InfoType as InformationType
                                        )}
                                        className="mr-2"
                                        onChange={(e) => {
                                          const updatedValue = e.target.checked
                                            ? [
                                                ...field.value,
                                                InfoType as InformationType,
                                              ]
                                            : field.value.filter(
                                                (val: InformationType) => val !== InfoType
                                              );
                                          field.onChange(updatedValue);
                                        }}
                                      />
                                      <label htmlFor={`checkbox-switch-${index + 1}`}>
                                        {InfoType}
                                      </label>
                                    </FormCheck>
                                  ))}

                                  {error && (
                                    <Error className="text-red-600 mt-2">
                                      {error.message}
                                    </Error>
                                  )}
                                </>
                              )}
                            />
                          </div>
                        </div>
                        
                        <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="w-full email-alert">
                            <FormCheck.Label className="block text-[0.9rem] font-semibold text-slate-500 mb-2 text-left">
                              Company
                            </FormCheck.Label>
                            <div className="text-left">
                              <Controller
                                name="company"
                                control={control}
                                rules={{}}
                                render={({ field, fieldState: { error } }) => (
                                  <>
                                    <CompanySelect
                                      value={field.value}
                                      onChange={field.onChange}
                                      isMulti={true}
                                      showDefaultOptions={false}
                                      className="mt-1"
                                    />
                                    {error && (
                                      <div>
                                        <Error className="text-red-600 mt-2">
                                          {error.message}
                                        </Error>
                                      </div>
                                    )}
                                  </>
                                )}
                              />
                            </div>
                          </div>
                          
                          <div className="w-full">
                            <FormCheck.Label className="block text-[0.9rem] font-semibold text-slate-500 mb-2 text-left">
                              Schedule*
                            </FormCheck.Label>
                            <Controller
                              name="schedule"
                              control={control}
                              rules={{ required: "Schedule is required" }}
                              render={({ field, fieldState: { error } }) => (
                                <>
                                  <div className="flex flex-col sm:flex-row py-2">
                                    <FormCheck className="flex items-center mr-2">
                                      <FormCheck.Input
                                        id="radio-switch-4"
                                        type="radio"
                                        {...field}
                                        value="Daily"
                                        checked={field.value === "Daily"}
                                        onChange={(e) => field.onChange("Daily")}
                                      />
                                      <FormCheck.Label
                                        htmlFor="radio-switch-4"
                                        className="ml-2"
                                      >
                                        Daily
                                      </FormCheck.Label>
                                    </FormCheck>
                                    <FormCheck className="flex items-center mr-2">
                                      <FormCheck.Input
                                        id="radio-switch-5"
                                        type="radio"
                                        {...field}
                                        value="Weekly"
                                        checked={field.value === "Weekly"}
                                        onChange={(e) => field.onChange("Weekly")}
                                      />
                                      <FormCheck.Label
                                        htmlFor="radio-switch-5"
                                        className="ml-2"
                                      >
                                        Weekly
                                      </FormCheck.Label>
                                    </FormCheck>
                                    <FormCheck className="flex items-center mt-2 sm:mt-0">
                                      <FormCheck.Input
                                        id="radio-switch-6"
                                        type="radio"
                                        {...field}
                                        value="Monthly"
                                        checked={field.value === "Monthly"}
                                        onChange={(e) => field.onChange("Monthly")}
                                      />
                                      <FormCheck.Label
                                        htmlFor="radio-switch-6"
                                        className="ml-2"
                                      >
                                        Monthly
                                      </FormCheck.Label>
                                    </FormCheck>
                                  </div>
                                  {error && (
                                    <Error className="text-red-600 mt-2">
                                      {error.message}
                                    </Error>
                                  )}
                                </>
                              )}
                            />
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="w-full">
                            <FormCheck.Label className="block text-[0.9rem] font-semibold text-slate-500 mb-2 text-left">
                              Institution
                            </FormCheck.Label>
                            <Controller
                              name="institution"
                              control={control}
                              defaultValue={[]}
                              render={({ field, fieldState: { error } }) => (
                                <>
                                  <MultiSelectDropdown
                                    data={institutionOptions}
                                    loading={institutionLoading}
                                    selectedOption={field.value || []}
                                    onChange={(opts) => field.onChange(opts)}
                                    placeholder={institutionLoading ? "Loading options..." : "Select Institution"}
                                    alignLeft
                                    size="compact"
                                  />
                                  {error && (
                                    <Error className="text-red-600 mt-2">
                                      {error.message}
                                    </Error>
                                  )}
                                </>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-center sm:justify-end gap-3 w-full px-4 py-3 mt-6">
                      <Button
                        onClick={() => {
                          reset();
                          setWhatsNewFormVisible(false);
                          setEditingAlert(null);
                          setFormMode('create');
                          setActiveTab(0);
                        }}
                        type="button"
                        variant="outline-secondary"
                        className="w-full sm:w-auto border-danger text-danger"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        disabled={isLoading}
                        className="w-full sm:w-auto px-4 py-2 bg-gradient-to-b rounded-t-md to-[#000000CC] from-[#9F1239]"
                      >
                        {isLoading && (
                          <Lucide
                            icon="Loader"
                            type="submit"
                            className={`w-4 h-4 mr-1.5 stroke-[1.3] ${
                              isLoading ? "animate-spin" : ""
                            }`}
                          />
                        )}
                        {formMode === 'edit' ? "Update" : "Submit"}
                      </Button>
                    </div>
                  </form>
                </Tab.Panel>

                {/* Email Alerts Table Panel */}
                <Tab.Panel>
                  <div className="bg-white dark:bg-darkmode-800 rounded-lg">
                    <div className="p-4">

                      {loadingAlerts ? (
                        <div className="flex justify-center items-center py-8">
                          <LoadingIcon
                            icon="three-dots"
                            className="w-6 h-6 text-primary"
                            color="#800000"
                          />
                        </div>
                      ) : emailAlerts.length === 0 ? (
                        <div className="text-center py-8">
                          <Lucide icon="Mail" className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500">No email alerts found</p>
                          <p className="text-slate-400 text-sm">Create your first email alert to get started.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full table-auto">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-darkmode-600">
                                <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400 text-sm">
                                  Alert Name
                                </th>
                                <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400 text-sm">
                                  Schedule
                                </th>
                                <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400 text-sm">
                                  Date Created
                                </th>
                                <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400 text-sm">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {emailAlerts.map((alert) => (
                                <tr
                                  key={alert.id}
                                  className="border-b border-slate-100 dark:border-darkmode-700 hover:bg-slate-50 dark:hover:bg-darkmode-700 transition-colors"
                                >
                                  <td className="py-3 px-3 text-left">
                                    <div className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                                      {alert.alert_name}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-left">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary">
                                      {alert.schedule}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-left">
                                    <div className="text-slate-600 dark:text-slate-400 text-xs">
                                      {new Date(alert.date_created).toLocaleDateString()}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-left">
                                    <div className="flex items-center space-x-1">
                                      <Tippy content="Edit Alert" options={{ theme: "light" }}>
                                        <button
                                          onClick={() => {
                                            handleUpdateAlert(alert);
                                            setActiveTab(0);
                                          }}
                                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                        >
                                          <Lucide icon="PenSquare" className="w-4 h-4" />
                                        </button>
                                      </Tippy>
                                      <Tippy content="Delete Alert" options={{ theme: "light" }}>
                                        <button
                                          onClick={() => {
                                            if (window.confirm("Are you sure you want to delete this email alert?")) {
                                              handleDeleteAlert(alert.id);
                                            }
                                          }}
                                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                        >
                                          <Lucide icon="Trash2" className="w-4 h-4" />
                                        </button>
                                      </Tippy>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
          </Dialog.Description>
        </Dialog.Panel>
      </Dialog>
    </>
  );
};

export default GetWhatsNew;
