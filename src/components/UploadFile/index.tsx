import React, { useEffect, useRef, useState } from "react";
import { Controller, SubmitErrorHandler, useForm } from "react-hook-form";
import { Dialog } from "@/components/Base/Headless";
import Button from "@/components/Base/Button";
import Dropzone, { DropzoneElement } from "@/components/Base/Dropzone";
import { AppDispatch } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import Lucide from "../Base/Lucide";
import { bytesToMB, createDynamicURL, getYearRange } from "@/utils/helper";
import Error from "@/components/Error";
import { toast } from "react-toastify";
import { addEditProxyVotingGuideline, fetchProxyVotingGuidelines, uploadSummaryFile } from "@/stores/proxyVotingGuidelineSlice";
import { baseURL } from "@/constant";
import { ProxyVotingGuideline } from "@/types/proxyVotingGuideline";


interface AddUploadFile {
    uploadFileVisible: boolean;
    setUploadFileVisible: (visible: boolean) => void;
    proxyId: number | null;
}


const index: React.FC<AddUploadFile> = ({
    uploadFileVisible,
    setUploadFileVisible,
    proxyId,
}) => {

    const [fileUploadDetail, setFileUploadDetail] = useState<any>(null);
    const [showRequiredStateErrors, setShowRequiredStateErrors] =
        useState<boolean>(false);
    const dropzoneSingleRef = useRef<DropzoneElement>(null);
    const dispatch: AppDispatch = useAppDispatch();
    const { loading, page, filters } = useAppSelector((state) => state.proxyVotingGuideline);

    useEffect(() => {
        const elDropzoneSingleRef = dropzoneSingleRef.current;

        if (elDropzoneSingleRef) {
            const dropzoneInstance = elDropzoneSingleRef.dropzone;

            const handleComplete = (file: any) => {
                if (file?.status === "added") {
                    const fileExtension = file?.name?.split(".").pop()?.toLowerCase();

                    if (!fileExtension || !["xlsx"].includes(fileExtension)) {
                        toast.error("Only Excel files (.xlsx) are allowed!");
                    } else {
                        setFileUploadDetail(file);
                    }

                    dropzoneInstance.removeFile(file);
                }

                if (file?.status === "error") {
                    toast.error("Something went wrong during file upload!");
                }
            };

            dropzoneInstance.on("addedfile", handleComplete);

            return () => {
                dropzoneInstance.off("addedfile", handleComplete);
            };
        }
    }, [dropzoneSingleRef, uploadFileVisible, fileUploadDetail]);


    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<any>({
        defaultValues: {
        },
    });


    const onSubmit = async (data: any) => {
        if (!fileUploadDetail) {
            toast.error("No file selected");
            return;
        }

        const transformedData = {
            proxy_voting_guidelines_id: proxyId
        };
        const formData = new FormData();

        for (const [key, value] of Object.entries(transformedData)) {
            formData.append(key, value as any);
        }
        formData.append("file", fileUploadDetail);
        try {
            let response = await dispatch(
                uploadSummaryFile({
                    data: formData as unknown as Partial<ProxyVotingGuideline>,
                })
            ).unwrap();

            toast.success("File Upload Successfully");

            const dynamicURL = createDynamicURL(`${baseURL}/proxy_voting_guidelines/`, filters, undefined, page);
            dispatch(fetchProxyVotingGuidelines(dynamicURL));
        } catch (error) {
            console.error("Error submitting form:", error);
        } finally {
            setUploadFileVisible(false);
        }
    };

    const onError: SubmitErrorHandler<AddUploadFile> = () => {
        if (!fileUploadDetail) {
            setShowRequiredStateErrors(true);
        }
    };
    return (
        <Dialog
            size="xl"
            open={uploadFileVisible}
            onClose={() => setUploadFileVisible(false)}
        >
            <Dialog.Panel className=" text-center">
                <form onSubmit={handleSubmit(onSubmit, onError)}>
                    <Dialog.Title>
                        <h2 className="mr-auto text-xl font-semibold">
                            Upload File
                        </h2>
                        <div
                            onClick={() => setUploadFileVisible(false)}
                            className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer"
                        >
                            <Lucide icon="X" className="w-8 h-8 text-slate-400" />
                        </div>
                    </Dialog.Title>
                    <Dialog.Description className="px-6 py-4 space-y-6">
                        <div className="grid">
                            <div className="mb-10">
                                <label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
                                    Upload Excel File
                                </label>
                                <div className="w-full  max-h-[200px]">
                                    {fileUploadDetail ? (
                                        <>
                                            <div className="flex items-center  w-full relative px-3 py-2.5 rounded-[0.6rem] border border-slate-200/80 hover:bg-slate-50 cursor-pointer transition sm:px-5 shadow-sm">
                                                <div className="ml-4">
                                                    <Lucide
                                                        icon="FileText"
                                                        className="w-8  h-8 stroke-[1.7] stroke-slate-400/70"
                                                    />
                                                </div>
                                                <div className="flex flex-col w-full ml-3 lg:items-center lg:flex-row gap-y-1">
                                                    <p className="block font-medium capitalize truncate md:max-w-[100px] sm:max-w-[80px] lg:max-w-[150px] text-ellipsis overflow-hidden whitespace-nowrap lg:text-center">
                                                        {fileUploadDetail?.name}
                                                    </p>
                                                    <div className="mr-4 text-xs lg:text-center lg:ml-auto text-slate-500/80">
                                                        File size: {bytesToMB(188887)} MB
                                                    </div>
                                                </div>
                                                <Lucide
                                                    onClick={() => {
                                                        setFileUploadDetail(null);
                                                    }}
                                                    icon="Trash2"
                                                    className="w-6  h-6 stroke-[1.7] stroke-slate-400/70"
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
                                                // acceptedFiles: ".xlsx",
                                                acceptedFiles: ".xlsx",
                                            }}
                                            className="dropzone w-full flex flex-col justify-center items-center h-full "
                                        >
                                            <div className="text-base font-semibold text-gray-800 mb-2">
                                                Drop files here or click to upload.
                                            </div>
                                            Only <span className="font-medium">excel</span> files are
                                            allowed.
                                        </Dropzone>
                                    )}
                                    {!fileUploadDetail && showRequiredStateErrors && (
                                        <Error className=" max-w-[100%] ">
                                            file are required
                                        </Error>
                                    )}
                                </div>
                            </div>


                        </div>
                    </Dialog.Description>
                    <Dialog.Footer>
                        <Button
                            type="button"
                            variant="outline-secondary"
                            onClick={() => setUploadFileVisible(false)}
                            className="w-20 mr-3"
                        >
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit">
                            {loading && (
                                <Lucide
                                    icon="Loader"
                                    className={`w-4 h-4 mr-1.5 stroke-[1.3] ${loading ? "animate-spin" : ""
                                        }`}
                                />
                            )}

                            Upload
                        </Button>
                    </Dialog.Footer>
                </form>
            </Dialog.Panel>
        </Dialog>
    )
}

export default index;