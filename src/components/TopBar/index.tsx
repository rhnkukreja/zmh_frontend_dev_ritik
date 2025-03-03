import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";

interface ChildProps {
    logoUrl: string;
    companyName: string;
  }

const index: React.FC<ChildProps> = ({ logoUrl, companyName }) => {
    return (
        <div className="bg-gradient-to-b rounded-2xl to-[#000000CC] from-[#9F1239] background text-white p-3 ">
            <div className='flex items-center justify-between'>
                <div className="flex items-center flex-row justify-center">
                    <div className=" w-20 bg-white p-2 rounded-xl">
                        <img src={logoUrl} />
                    </div>
                    <div className="ml-5">
                        <h1 className="font-semibold text-3xl">{companyName}</h1>
                    </div>
                </div>

                {/* <div className='flex items-center justify-between w-[950px] text-md font-semibold'>

                    <div className='flex items-start justify-center flex-col'>
                        <div className='flex  justify-center py-2 '>
                            <h1 className="mr-4">Group Name:</h1>
                            <h1>No Dedicated Stewardship Team</h1>
                        </div>
                        <div className='flex  justify-center py-2'>
                            <h1 className="mr-4">Email:</h1>
                            <h1>N/A</h1>
                        </div>
                    </div>

                    <div className='flex items-start justify-center flex-col'>
                        <div className='flex  justify-center py-2'>
                            <h1 className="mr-4">Switchboard:</h1>
                            <h1>(800) 637 – 7455</h1>
                        </div>
                        <div className='flex  justify-center py-2'>
                            <h1 className="mr-4">Address:</h1>
                            <h1 className='text-wrap w-[340px]'>4 World Financial Center, 250 Vesey Street, New York, NY 10080</h1>
                        </div>
                    </div>



                    
                </div> */}
            </div>


        </div>
    )
}

export default index