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
  const startPages = 3;
  const endPages = 3;
  const middlePages = 3; // Declare middlePages here

  const renderPageNumbers = () => {
    const pages = [];

    // Add first pages
    for (let i = 1; i <= Math.min(startPages, totalPages); i++) {
      pages.push(
        <Pagination.Link key={i} active={i === page}>
          <span onClick={() => handlePageChange(i)}>{i}</span>
        </Pagination.Link>
      );
    }

    // Add ellipsis if needed
    if (page > startPages + 1) {
      pages.push(
        <Pagination.Link key="dots1">
          <span>...</span>
        </Pagination.Link>
      );
    }

    // Add middle pages
    const startMiddle = Math.max(page - middlePages, startPages + 1);
    const endMiddle = Math.min(page + middlePages, totalPages - endPages);
    
    for (let i = startMiddle; i <= endMiddle; i++) {
      if (i > startPages) { // Avoid duplicates
        pages.push(
          <Pagination.Link key={i} active={i === page}>
            <span onClick={() => handlePageChange(i)}>{i}</span>
          </Pagination.Link>
        );
      }
    }

    // Add ellipsis if needed
    if (page + middlePages < totalPages - endPages) {
      pages.push(
        <Pagination.Link key="dots2">
          <span>...</span>
        </Pagination.Link>
      );
    }

    // Add last pages
    for (let i = Math.max(totalPages - endPages + 1, startMiddle); i <= totalPages; i++) {
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