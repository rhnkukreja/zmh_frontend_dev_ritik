import React, { useEffect, useRef, useState } from "react";
import { Controller, SubmitErrorHandler, useForm } from "react-hook-form";
import Button from "@/components/Base/Button";
import { FormCheck } from "@/components/Base/Form";
import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import Dropzone, { DropzoneElement } from "@/components/Base/Dropzone";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch } from "@/stores/store";
import { addEditCompany, fetchCompanies } from "@/stores/companySlice";
import { CompanyData } from "@/types/company";
import { bytesToMB, createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import Error from "@/components/Error";

interface AddEditCompanyProps {
  addNewCompanyVisible: boolean;
  setAddNewCompanyVisible: (visible: boolean) => void;
  selectedCompany: CompanyData | null;
}

export const AddEditCompany: React.FC<AddEditCompanyProps> = ({
  addNewCompanyVisible,
  setAddNewCompanyVisible,
  selectedCompany,
}) => {
  const dropzoneSingleRef = useRef<DropzoneElement>(null);
  const dispatch: AppDispatch = useAppDispatch();
  const { loading, page } = useAppSelector((state) => state.company);

  const [companyFile, setCompanyFile] = useState<File | null>(null);
  const [showRequiredStateErrors, setShowRequiredStateErrors] =
    useState<boolean>(false);

  useEffect(() => {
    const elDropzoneSingleRef = dropzoneSingleRef.current;

    if (elDropzoneSingleRef) {
      const dropzoneInstance = elDropzoneSingleRef.dropzone;

      const handleComplete = (file: any) => {
        if (file?.status === "added") {
          const fileType = file?.name?.split(".")?.pop();

          console.log("file: ", file);
          if (fileType && !["xlsx"].includes(fileType)) {
            toast.error("Only excel file are allowed!");
          } else {
            setCompanyFile(file);
          }
          dropzoneInstance.removeFile(file);
        }
        if (file?.status === "error") {
          const fileType = file?.name?.split(".")?.pop();

          if (fileType && !["xlsx"].includes(fileType)) {
            toast.error("Only excel file are allowed!");
          } else {
            toast.error("Something went wrong!");
          }
        }
      };

      dropzoneInstance.on("addedfile", handleComplete);
      return () => {
        dropzoneInstance.off("addedfile", handleComplete);
      };
    }
  }, [dropzoneSingleRef.current, companyFile, addNewCompanyVisible]);

  const { handleSubmit } = useForm();

  const onSubmit = async () => {
    const formData = new FormData();
    if (!companyFile) {
      return;
    } else {
      setShowRequiredStateErrors(false);
    }

    if (companyFile) {
      formData.append("bulk_upload_file", companyFile);
    }

    try {
      let response;

      if (selectedCompany) {
        response = await dispatch(
          addEditCompany({
            id: selectedCompany?.id,
            data: formData as unknown as Partial<CompanyData>,
          })
        ).unwrap();
      } else {
        response = await dispatch(
          addEditCompany({
            data: formData as unknown as Partial<CompanyData>,
          })
        ).unwrap();

        dispatch(
          fetchCompanies(
            createDynamicURL(`${baseURL}/company/`, undefined, page)
          )
        );
      }

      if (response?.results?.company_id === null) {
        toast.success(
          selectedCompany
            ? "Company updated successfully"
            : "File uploaded successfully"
        );
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setAddNewCompanyVisible(false);
    }
  };

  const onError: SubmitErrorHandler<any> = () => {
    if (!companyFile) {
      setShowRequiredStateErrors(true);
    }
  };

  return (
    <Dialog
      size="lg"
      open={addNewCompanyVisible}
      onClose={() => setAddNewCompanyVisible(false)}
    >
      <Dialog.Panel className="text-center">
        <form onSubmit={handleSubmit(onSubmit, onError)}>
          <Dialog.Title>
            <h2 className="mr-auto text-xl font-semibold">
              {selectedCompany ? "Edit Company" : "Add New Company"}
            </h2>
            <div
              onClick={() => setAddNewCompanyVisible(false)}
              className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer"
            >
              <Lucide icon="X" className="w-8 h-8 text-slate-400" />
            </div>
          </Dialog.Title>
          <Dialog.Description className="px-6 py-4 space-y-6">
            <div className={`w-full ${companyFile ? "" : "mb-20"}`}>
              <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                Company
              </FormCheck.Label>
              <div className="w-full max-h-[180px]">
                {companyFile ? (
                  <>
                    <div className="flex items-center w-full relative px-3 py-2.5 rounded-[0.6rem] border border-slate-200/80 hover:bg-slate-50 cursor-pointer transition sm:px-5 shadow-sm">
                      <div className="ml-4">
                        <Lucide
                          icon="FileText"
                          className="w-8 h-8 stroke-[1.7] stroke-slate-400/70"
                        />
                      </div>
                      <div className="flex flex-col w-full ml-3 lg:items-center lg:flex-row gap-y-1">
                        <p className="block font-medium capitalize truncate    text-ellipsis overflow-hidden whitespace-nowrap lg:text-center">
                          {companyFile?.name}
                        </p>
                        <div className="mr-4 text-xs lg:text-center lg:ml-auto text-slate-500/80">
                          File size: {bytesToMB(companyFile?.size)} MB
                        </div>
                      </div>
                      <Lucide
                        onClick={() => {
                          setCompanyFile(null);
                        }}
                        icon="Trash2"
                        className="w-6 h-6 stroke-[1.7] stroke-slate-400/70"
                      />
                    </div>
                  </>
                ) : (
                  <Dropzone
                    ref={dropzoneSingleRef}
                    options={{
                      url: "/",
                      autoProcessQueue: false,

                      clickable: true,
                      thumbnailWidth: 100,
                      maxFilesize: 5000,
                      maxFiles: 1,

                      acceptedFiles: ".xlsx",
                    }}
                    className="dropzone w-full flex flex-col justify-center items-center h-full "
                  >
                    <div className="text-base font-semibold text-gray-800 mb-2">
                      Drop files here or click to upload.
                    </div>
                    <div className="p-4 bg-gray-100 rounded-lg shadow-md">
                      <div className="text-sm text-gray-600 mb-1">
                        Only <span className="font-medium">xlsx</span> files are
                        allowed.
                      </div>
                      <div className="text-sm text-gray-600">
                        File should contain only 4 columns: <br />
                        <span className="font-medium text-gray-800">Name</span>,
                        <span className="font-medium text-gray-800">
                          {" "}
                          Designation
                        </span>
                        ,
                        <span className="font-medium text-gray-800">
                          {" "}
                          LinkedIn
                        </span>
                        ,
                        <span className="font-medium text-gray-800">
                          {" "}
                          Image
                        </span>
                        .
                      </div>
                    </div>
                  </Dropzone>
                )}
              </div>
              {!companyFile && showRequiredStateErrors && (
                <Error className=" max-w-[100%] ">
                  Voting Guidelines are required
                </Error>
              )}
            </div>
          </Dialog.Description>
          <Dialog.Footer className="gap-3 sm:gap-6">
            <Button
              type="button"
              variant="outline-secondary"
              onClick={() => {
                setAddNewCompanyVisible(false);
              }}
              className="w-20 mr-3"
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {loading && (
                <Lucide
                  icon="Loader"
                  className={`w-4 h-4 mr-1.5 stroke-[1.3] ${
                    loading ? "animate-spin" : ""
                  }`}
                />
              )}

              {selectedCompany ? "Update" : "Save"}
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Panel>
    </Dialog>
  );
};
