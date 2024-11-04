import { Dialog } from '@/components/Base/Headless';
import Lucide from '@/components/Base/Lucide';
import Table from '@/components/Base/Table';
import TableWrapper from '@/components/TableWrapper';
import React, { useEffect, useState } from 'react'
import whatsNewIcon from "@/assets/images/zmh-images/what_new_icon.png";
import { AppDispatch } from '@/stores/store';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { fetchWhatNewNotification } from '@/stores/dashboardSlice';
import { createDynamicURL } from '@/utils/helper';
import { baseURL } from '@/constant';
import { useNavigate } from 'react-router-dom';



interface NotificationAlertProps {
    notificationModalVisible: boolean;
    setNotificationModalVisible: (visible: boolean) => void;
    // selectedShareholderDetail: any | null;
}


const NotificationAlertDialog: React.FC<NotificationAlertProps> = ({
    notificationModalVisible,
    setNotificationModalVisible,
    // selectedShareholderDetail,
}) => {

    const { notificationLoading, totalNotification, notificationDetails } = useAppSelector((state) => state.dashboard);
    const navigate = useNavigate();
    const dispatch: AppDispatch = useAppDispatch();

    useEffect(() => {
        dispatch(
            fetchWhatNewNotification(
                createDynamicURL(
                    `${baseURL}/whatsnew`
                )
            )

        );
    }, [])


    const [expandedNotifications, setExpandedNotifications] = useState<{ [key: number]: boolean }>({});


    const handleToggleDescription = (index: number) => {
        setExpandedNotifications((prev: any) => ({
            ...prev,
            [index]: !prev[index],
        }));
    };
    return (
        <>
            <Dialog size="lg" open={notificationModalVisible}
                onClose={() => {
                    setNotificationModalVisible(false);
                }}>
                <Dialog.Panel className="text-center h-full">
                    <Dialog.Title className="bg-gradient-to-b rounded-t-md to-[#000000CC] from-[#9F1239]
                    text-white">
                        <h2 className="mr-auto text-xl font-semibold">What's New</h2>
                        <div onClick={() => {
                            setNotificationModalVisible(false);
                        }}
                            className="absolute top-0 right-0 mt-4 mr-5 cursor-pointer">
                            <Lucide icon="X" className="w-6 h-6 text-white" />
                        </div>

                    </Dialog.Title>
                    {/* <Dialog.Description > */}
                    <div className="relative w-full h-full">
                        <div className='flex items-center justify-center mb-4'>
                            <div className='flex flex-col items-center justify-center'>
                                <img className='w-24 mt-5' src={whatsNewIcon} alt="whats-new icon" />
                                <h1 className='font-bold text-[25px] mt-4'>What's New</h1>
                            </div>
                        </div>

                        <div className='p-5 h-[360px] overflow-y-scroll'>
                            {notificationDetails?.length > 0 &&
                                notificationDetails.map((alert: any, index: number) => (
                                    <div key={index} className='border border-gray-300 rounded-lg p-4 mt-3'>
                                        <div className='flex items-center justify-between'>
                                            <h1  onClick={() => navigate(alert?.link)} className='font-bold text-lg cursor-pointer'>{alert?.heading}</h1>
                                            {/* <h6 className='text-[12px]'>{alert?.date}</h6> */}
                                        </div>

                                        <div className='flex items-end justify-between mt-4'>
                                            <div className="flex flex-col items-start w-80">
                                                <h1
                                                    onClick={() => navigate(alert?.link)}
                                                    className='text-[14px] text-left font-semibold underline cursor-pointer'
                                                >
                                                    {expandedNotifications[index]
                                                        ? alert?.description
                                                        : `${alert?.description.substring(0, 15)}...`}
                                                </h1>
                                            </div>

                                            <h4
                                                onClick={() => handleToggleDescription(index)}
                                                className='text-[14px] font-semibold text-red-800 underline cursor-pointer'
                                            >
                                                {expandedNotifications[index] ? 'Show Less' : 'Read More'}
                                            </h4>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                    {/* </Dialog.Description> */}
                </Dialog.Panel>
            </Dialog>
        </>
    )
}

export default NotificationAlertDialog