import React from "react";
import Pagination from "../Base/Pagination";
import Lucide from "../Base/Lucide";

interface CPaginationProps {
  totalPages: number;
  page: number;
  handlePageChange: (page: number) => void;
  handlePreviousPage: React.MouseEventHandler<SVGSVGElement>;
  handleNextPage: React.MouseEventHandler<SVGSVGElement>;
}

const CPagination: React.FC<CPaginationProps> = ({
  totalPages,
  page,
  handlePageChange,
  handlePreviousPage,
  handleNextPage,
}) => {


  const renderPageNumbers = () => {
    const pages = [];
    const startPages = 3;
    const endPages = 3;
    const middlePages = 3;

    for (let i = 1; i <= startPages; i++) {
      if (i > totalPages) break;
      pages.push(
        <Pagination.Link key={i} active={i === page}>
          <span onClick={() => handlePageChange(i)}>{i}</span>
        </Pagination.Link>
      );
    }

    
    if (page > startPages) {
      pages.push(
        <Pagination.Link key="dots1" >
          <span>...</span>
        </Pagination.Link>
      );
    }

  
    const startMiddle = Math.max(page - 1, startPages + 1);
    const endMiddle = Math.min(page + middlePages - 1, totalPages - endPages);
    for (let i = startMiddle; i <= endMiddle; i++) {
      pages.push(
        <Pagination.Link key={i} active={i === page}>
          <span onClick={() => handlePageChange(i)}>{i}</span>
        </Pagination.Link>
      );
    }

    
    if (page + middlePages < totalPages - endPages) {
      pages.push(
        <Pagination.Link key="dots2" >
          <span>...</span>
        </Pagination.Link>
      );
    }

   
    for (let i = totalPages - endPages + 1; i <= totalPages; i++) {
      if (i <= startPages + middlePages) continue;
      pages.push(
        <Pagination.Link key={i} active={i === page}>
          <span onClick={() => handlePageChange(i)}>{i}</span>
        </Pagination.Link>
      );
    }

    return pages;
  };

  return (
    <Pagination className="flex-1 w-full mr-auto sm:w-auto">
      <Pagination.Link>
        <Lucide
          onClick={() => handlePageChange(1)}
          icon="ChevronsLeft"
          className="w-4 h-4"
        />
      </Pagination.Link>
      <Pagination.Link>
        <Lucide onClick={handlePreviousPage} icon="ChevronLeft" className="w-4 h-4" />
      </Pagination.Link>
      {renderPageNumbers()}
      <Pagination.Link>
        <Lucide onClick={handleNextPage} icon="ChevronRight" className="w-4 h-4" />
      </Pagination.Link>
      <Pagination.Link>
        <Lucide onClick={() => handlePageChange(totalPages)} icon="ChevronsRight" className="w-4 h-4" />
      </Pagination.Link>
    </Pagination>
  );
};

export default CPagination;
