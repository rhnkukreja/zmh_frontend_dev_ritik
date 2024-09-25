import Lucide from '../Base/Lucide';
import TableWrapper from '../TableWrapper';
import Table from "@/components/Base/Table";
import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";

const index = () => {
  return (
    <div className="p-5 mt-3.5 box ">
            <div className="w-full">
                <div className='flex justify-between items-center'>
                    <h1 className='text-md font-bold'>Case Studies</h1>
                    <Lucide icon="ChevronUp" className="w-4 h-4 ml-0.5" />
                </div>

                <div className='mt-5'>
                    <div className="min-h-[300px]">
                    <hr />

                      <div className='flex items-center justify-between py-3'>
                          <div className='h-[45px] flex flex-col justify-between '>
                              <h1 className='font-semibold'>The Vanguar Group</h1>
                              <span className='font-regular'>Internet Retail</span>
                          </div>

                          <div>
                              <h2 className='text-red-800 underline font-semibold'>Review</h2>
                          </div>
                      </div>

                      <hr />

                      <div className='flex items-center justify-between py-3'>
                          <div className='h-[45px] flex flex-col justify-between '>
                              <h1 className='font-semibold'>The Vanguar Group</h1>
                              <span className='font-regular'>Internet Retail</span>
                          </div>

                          <div>
                              <h2 className='text-red-800 underline font-semibold'>Review</h2>
                          </div>
                      </div>

                      <hr />

                      <div className='flex items-center justify-between py-3'>
                          <div className='h-[45px] flex flex-col justify-between '>
                              <h1 className='font-semibold'>The Vanguar Group</h1>
                              <span className='font-regular'>Internet Retail</span>
                          </div>

                          <div>
                              <h2 className='text-red-800 underline font-semibold'>Review</h2>
                          </div>
                      </div>

                      <hr />

                      <div className='flex items-center justify-between py-3'>
                          <div className='h-[45px] flex flex-col justify-between '>
                              <h1 className='font-semibold'>The Vanguar Group</h1>
                              <span className='font-regular'>Internet Retail</span>
                          </div>

                          <div>
                              <h2 className='text-red-800 underline font-semibold'>Review</h2>
                          </div>
                      </div>

                      <hr />

                      

                    
                    </div>

                </div>
            </div>
        </div>
  )
}

export default index