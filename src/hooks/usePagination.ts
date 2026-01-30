import { useMemo, useState } from "react";

interface UsePaginationOptions {
  totalItems: number;
  itemsPerPage?: number;
  initialPage?: number;
}

export function usePagination({
  totalItems,
  itemsPerPage = 20,
  initialPage = 1,
}: UsePaginationOptions) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const pageRange = useMemo(() => {
    const range: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let i = start; i <= end; i += 1) {
      range.push(i);
    }
    return range;
  }, [currentPage, totalPages]);

  return {
    currentPage,
    setCurrentPage,
    totalPages,
    pageRange,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    nextPage: () => setCurrentPage((page) => Math.min(page + 1, totalPages)),
    prevPage: () => setCurrentPage((page) => Math.max(page - 1, 1)),
  };
}
