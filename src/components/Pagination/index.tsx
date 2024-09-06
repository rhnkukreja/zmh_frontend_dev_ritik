import React from "react";
import Pagination from "../Base/Pagination";
import Lucide from "../Base/Lucide";

interface CPaginationProps {
  totalPages: number;
  page: number;
  handlePageChange: (page: number) => void;
}

const CPagination: React.FC<CPaginationProps> = ({
  totalPages,
  page,
  handlePageChange,
}) => {
  const renderPageNumbers = () => {
    const pages = [];
    const adjacentPages = 3;

    const addPageLink = (i: number) => {
      pages.push(
        <Pagination.Link key={i} active={i === page}>
          <span onClick={() => handlePageChange(i)}>{i}</span>
        </Pagination.Link>
      );
    };

    // Add first page
    addPageLink(1);

    // Add ellipsis if there's a gap after first page
    if (page - adjacentPages > 2) {
      pages.push(<Pagination.Link key="leftEllipsis"><span>...</span></Pagination.Link>);
    }

    // Add adjacent pages before current page
    for (let i = Math.max(2, page - adjacentPages); i < page; i++) {
      addPageLink(i);
    }

    // Add current page
    if (page !== 1 && page !== totalPages) {
      addPageLink(page);
    }

    // Add adjacent pages after current page
    for (let i = page + 1; i <= Math.min(totalPages - 1, page + adjacentPages); i++) {
      addPageLink(i);
    }

    // Add ellipsis if there's a gap before last page
    if (page + adjacentPages < totalPages - 1) {
      pages.push(<Pagination.Link key="rightEllipsis"><span>...</span></Pagination.Link>);
    }

    // Add last page
    if (totalPages !== 1) {
      addPageLink(totalPages);
    }

    return pages;
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      handlePageChange(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      handlePageChange(page + 1);
    }
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