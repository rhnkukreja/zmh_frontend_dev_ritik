import { FC } from 'react';

interface PillProps {
    text: string;
}

const Pill: FC<PillProps> = ({ text }) => {
    return (
        <span className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded-full font-medium">
            {text}
        </span>
    );
};

export default Pill;