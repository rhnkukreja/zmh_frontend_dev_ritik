import React from 'react'

interface ChildProps {
    menu: any;
}

const index: React.FC<ChildProps> = ({ menu }) => {
    return (
        <div className='p-5 mt-3.5 box h-[345px]'>
            <div className="">
                <ul >
                    <li className='p-4 bg-[#f6e8ec] text-[#9F1239] font-semibold cursor-pointer rounded-md'>&#10022; Overview</li>
                    {/* <li className='p-4'>2. Shareholder Proposal</li> */}
                    {menu?.companies_engaged?.length > 0 &&
                        <li className='p-4'> &#10022; Companies Engaged</li>
                    }
                    {menu?.case_studies?.length > 0 &&
                        <li className='p-4'> &#10022; Case Studies</li>
                    }
                    {menu?.engagement_questions?.length > 0 &&
                        <li className='p-4'> &#10022; Engagement Questions</li>
                    }
                </ul>
            </div>
        </div>
    )
}

export default index