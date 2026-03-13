import TableWrapper from "../TableWrapper";
import Table from "@/components/Base/Table";
import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";
import linkedinIcon from "../../assets/images/zmh-images/linkedinIcon.png";
import { useEffect, useState } from "react";

interface ChildProps {
  contacts: any;
}

const index: React.FC<ChildProps> = ({ contacts }) => {
  const checkImageUrl = async (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;

      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
  };

  const [validImages, setValidImages] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const validateImages = async () => {
      const tempValidImages: { [key: string]: string } = {};
      for (const contact of contacts || []) {
        const isValid = await checkImageUrl(contact?.image);
        tempValidImages[contact?.name] = isValid
          ? contact?.image
          : userLinkedinImage;
      }

      setValidImages(tempValidImages);
    };

    validateImages();
  }, [contacts]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
      <div className="bg-gradient-to-r from-primary to-primary/90 px-6 py-4">
        <h2 className="text-lg font-bold text-white">Key Contacts</h2>
      </div>

      {/* <div className='w-full h-[250px] pr-6 overflow-y-scroll'>
                <ul>
                    {contacts?.length > 0 &&
                        contacts?.map((contact: any) => (
                            <li className='flex items-center justify-between '>
                                <span className='w-16'>
                                    <img src={validImages[contact.name]} />
                                </span>

                                <span>
                                    <h1>{contact?.name}</h1>
                                    <div dangerouslySetInnerHTML={{ __html: contact?.designation }} className='mt-2'>
                                    </div>
                                </span>

                                <span onClick={() => window.open(contact?.linkedin, '_blank')}
                                    className="text-right cursor-pointer text-blue-800">
                                    linkedin
                                </span>
                            </li>
                        ))
                    }

                </ul>
            </div> */}

      <div className="p-6 max-h-[500px] overflow-y-auto">
        <div className="space-y-4">
          {contacts?.length > 0 &&
            contacts?.map((contact: any) => (
              <div
                key={contact.name}
                className="flex items-start gap-4 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200"
              >
                <div className="flex-shrink-0 w-14 h-14 overflow-hidden rounded-full border-2 border-primary/20">
                  <img
                    alt={contact?.name}
                    src={validImages[contact.name]}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-[15px] mb-1">
                    {contact?.name}
                  </h3>
                  <div
                    className="text-sm text-slate-600"
                    dangerouslySetInnerHTML={{
                      __html: contact?.designation,
                    }}
                  />
                  {contact?.linkedin && (
                    <button
                      onClick={() => window.open(contact?.linkedin, "_blank")}
                      className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      <img src={linkedinIcon} className="w-4 h-4" alt="LinkedIn" />
                      LinkedIn Profile
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default index;
