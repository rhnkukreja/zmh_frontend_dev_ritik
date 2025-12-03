import { characterColors, PAGE_SIZE, proposal_keywords } from "@/constant";
import { FormattedMenu } from "@/themes/Echo/side-menu";
import { FilterObject } from "@/types/common";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { parseColor } from "tailwindcss/lib/util/color";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

dayjs.extend(duration);

const cutText = (text: string, length: number) => {
  if (text.split(" ").length > 1) {
    const string = text.substring(0, length);
    const splitText = string.split(" ");
    splitText.pop();
    return splitText.join(" ") + "...";
  } else {
    return text;
  }
};

const formatDate = (date: string, format: string) => {
  return dayjs(date).format(format);
};

const capitalizeFirstLetter = (string: string) => {
  if (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  } else {
    return "";
  }
};

const onlyNumber = (string: string) => {
  if (string) {
    return string.replace(/\D/g, "");
  } else {
    return "";
  }
};

const getCurrentYear = () => {
  return new Date().getFullYear();
};

const formatCurrency = (number: number) => {
  if (number) {
    const formattedNumber = number.toString().replace(/\D/g, "");
    const rest = formattedNumber.length % 3;
    let currency = formattedNumber.substr(0, rest);
    const thousand = formattedNumber.substr(rest).match(/\d{3}/g);
    let separator;

    if (thousand) {
      separator = rest ? "," : "";
      currency += separator + thousand.join(",");
    }

    return currency;
  } else {
    return "";
  }
};

const timeAgo = (time: string) => {
  const date = new Date((time || "").replace(/-/g, "/").replace(/[TZ]/g, " "));
  const diff = (new Date().getTime() - date.getTime()) / 1000;
  const dayDiff = Math.floor(diff / 86400);

  if (isNaN(dayDiff) || dayDiff < 0 || dayDiff >= 31) {
    return dayjs(time).format("MMMM DD, YYYY");
  }

  return (
    (dayDiff === 0 &&
      ((diff < 60 && "just now") ||
        (diff < 120 && "1 minute ago") ||
        (diff < 3600 && Math.floor(diff / 60) + " minutes ago") ||
        (diff < 7200 && "1 hour ago") ||
        (diff < 86400 && Math.floor(diff / 3600) + " hours ago"))) ||
    (dayDiff === 1 && "Yesterday") ||
    (dayDiff < 7 && dayDiff + " days ago") ||
    (dayDiff < 31 && Math.ceil(dayDiff / 7) + " weeks ago")
  );
};

const diffTimeByNow = (time: string) => {
  const startDate = dayjs(dayjs().format("YYYY-MM-DD HH:mm:ss").toString());
  const endDate = dayjs(dayjs(time).format("YYYY-MM-DD HH:mm:ss").toString());

  const duration = dayjs.duration(endDate.diff(startDate));
  const milliseconds = Math.floor(duration.asMilliseconds());

  const days = Math.round(milliseconds / 86400000);
  const hours = Math.round((milliseconds % 86400000) / 3600000);
  let minutes = Math.round(((milliseconds % 86400000) % 3600000) / 60000);
  const seconds = Math.round(
    (((milliseconds % 86400000) % 3600000) % 60000) / 1000
  );

  if (seconds < 30 && seconds >= 0) {
    minutes += 1;
  }

  return {
    days: days.toString().length < 2 ? "0" + days : days,
    hours: hours.toString().length < 2 ? "0" + hours : hours,
    minutes: minutes.toString().length < 2 ? "0" + minutes : minutes,
    seconds: seconds.toString().length < 2 ? "0" + seconds : seconds,
  };
};

const isset = (obj: object | string) => {
  if (obj !== null && obj !== undefined) {
    if (typeof obj === "object" || Array.isArray(obj)) {
      return Object.keys(obj).length;
    } else {
      return obj.toString().length;
    }
  }

  return false;
};

const toRaw = (obj: object) => {
  return JSON.parse(JSON.stringify(obj));
};

const randomNumbers = (from: number, to: number, length: number) => {
  const numbers = [0];
  for (let i = 1; i < length; i++) {
    numbers.push(Math.ceil(Math.random() * (from - to) + to));
  }

  return numbers;
};

const toRGB = (value: string) => {
  return parseColor(value).color.join(" ");
};

const stringToHTML = (arg: string) => {
  const parser = new DOMParser(),
    DOM = parser.parseFromString(arg, "text/html");
  return DOM.body.childNodes[0] as HTMLElement;
};

const slideUp = (
  el: HTMLElement,
  duration = 300,
  callback = (el: HTMLElement) => { }
) => {
  el.style.transitionProperty = "height, margin, padding";
  el.style.transitionDuration = duration + "ms";
  el.style.height = el.offsetHeight + "px";
  el.offsetHeight;
  el.style.overflow = "hidden";
  el.style.height = "0";
  el.style.paddingTop = "0";
  el.style.paddingBottom = "0";
  el.style.marginTop = "0";
  el.style.marginBottom = "0";
  window.setTimeout(() => {
    el.style.display = "none";
    el.style.removeProperty("height");
    el.style.removeProperty("padding-top");
    el.style.removeProperty("padding-bottom");
    el.style.removeProperty("margin-top");
    el.style.removeProperty("margin-bottom");
    el.style.removeProperty("overflow");
    el.style.removeProperty("transition-duration");
    el.style.removeProperty("transition-property");
    callback(el);
  }, duration);
};

const slideDown = (
  el: HTMLElement,
  duration = 300,
  callback = (el: HTMLElement) => { }
) => {
  el.style.removeProperty("display");
  let display = window.getComputedStyle(el).display;
  if (display === "none") display = "block";
  el.style.display = display;
  let height = el.offsetHeight;
  el.style.overflow = "hidden";
  el.style.height = "0";
  el.style.paddingTop = "0";
  el.style.paddingBottom = "0";
  el.style.marginTop = "0";
  el.style.marginBottom = "0";
  el.offsetHeight;
  el.style.transitionProperty = "height, margin, padding";
  el.style.transitionDuration = duration + "ms";
  el.style.height = height + "px";
  el.style.removeProperty("padding-top");
  el.style.removeProperty("padding-bottom");
  el.style.removeProperty("margin-top");
  el.style.removeProperty("margin-bottom");
  window.setTimeout(() => {
    el.style.removeProperty("height");
    el.style.removeProperty("overflow");
    el.style.removeProperty("transition-duration");
    el.style.removeProperty("transition-property");
    callback(el);
  }, duration);
};

const getPageNumbers = (totalCounts: number, perPageCount = PAGE_SIZE): number => {
  return Math.ceil(totalCounts / perPageCount);
};

function createDynamicURL<T extends Record<string, string | string[] | any>>(
  baseURL: string,
  filters?: T,
  extraPrams?: Record<string, string | string[] | any> | undefined,
  page?: number
): string {
  const queryParams = new URLSearchParams();
  
  // Helper function to handle parameter formatting consistently
  const addParamToQuery = (key: string, value: any) => {
    // If already stringified JSON, add directly
    if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      queryParams.append(key, value);
    } 
    // If array, stringify it
    else if (Array.isArray(value)) {
      if (value.length > 0) {
        queryParams.append(key, JSON.stringify(value));
      }
    } 
    // For other values
    else if (value !== null && value !== undefined && value !== "" && value !== " ") {
      queryParams.append(key, value.toString());
    }
  };

  // Always ensure we have a year parameter in NPX-related API calls
  const isNPXRequest = 
    baseURL.includes('/npx/') || 
    baseURL.includes('get_npx_dropdown_values') || 
    baseURL.includes('npx') || 
    baseURL.includes('NPX');

  if (isNPXRequest && !filters?.year && !extraPrams?.year) {
    // Get year from URL or use default
    const urlParams = new URLSearchParams(window.location.search);
    const yearParam = urlParams.get('year') || '2024';
    
    // Add year parameter explicitly
    queryParams.append('year', yearParam);
  }

  // Add extra params first
  if (extraPrams) {
    for (const key in extraPrams) {
      addParamToQuery(key, extraPrams[key]);
    }
  }

  // Then add filters
  if (filters) {
    for (const key in filters) {
      addParamToQuery(key, filters[key]);
    }
  }

  const queryString = queryParams.toString();
  if (page && queryString) {
    return `${baseURL}?${queryString}&page=${page}`;
  } else if (queryString) {
    return `${baseURL}?${queryString}`;
  } else if (page) {
    return `${baseURL}?page=${page}`;
  } else {
    return baseURL;
  }
}

const getColorForCharacter = (char: string) => {
  return characterColors[char.toUpperCase()] || "#FFFFFF";
};

function bytesToMB(bytes: number): number {
  return parseFloat((bytes / (1024 * 1024)).toFixed(2));
}

const getYearRange = (range: number): string[] => {
  const now = new Date().getUTCFullYear();
  const endYear = now + 1; // Include 2026
  return Array(endYear - (endYear - range))
    .fill("")
    .map((v, idx) => endYear - idx)
    .map(String);
};


const formatedDate = (dateString: string): string => {
  const parsedDate = dayjs(dateString, "D MMM, YYYY");

  const now = dayjs();
  const fullDate = parsedDate
    .set("hour", now.hour())
    .set("minute", now.minute())
    .set("second", now.second())
    .set("millisecond", now.millisecond());

  return fullDate.format("YYYY-MM-DDTHH:mm:ss");
};

const getDateWithoutTime = (datetimeString?: string): string => {
  if (!datetimeString || !dayjs(datetimeString).isValid()) {
    return "";
  }
  return dayjs(datetimeString).format("YYYY-MM-DD");
};

const getCustomRelativeDate = (dateStr: string): string => {
  const now = dayjs().startOf("day");
  const date = dayjs(dateStr).startOf("day");

  const diff = now.diff(date, "day");

  if (diff === 0) {
    return `Today, ${date.format("MMM D")}`; 
  } else if (diff === 1) {
    return `Yesterday, ${date.format("MMM D")}`; 
  } else {
    return `${date.format("dddd")}, ${date.format("MMM D")}`; 
  } 
};

const filterMenu = (menuItems: (string | FormattedMenu)[]) => {
  const userType = localStorage.getItem("userType")?.toLowerCase() || "";
  const filteredMenuItems = menuItems.filter((item, index, arr) => {
    if (userType !== "admin") {
      if (typeof item === "string" && item.toLowerCase() === "Additional") {
        let i = index + 1;
        while (
          i < arr.length &&
          typeof arr[i] === "object" &&
          (arr[i] as FormattedMenu).isAdmin === true
        ) {
          i++;
        }
        return false;
      }
      if (typeof item === "object" && item.isAdmin) {
        return false;
      }
    }
    return true;
  });

  return filteredMenuItems;
};

export const downloadFileFromAPI = async ({
  url,
  fileName,
  setLoading,
  serviceMethod
}) => {
  setLoading(true);
  try {
    const file = await serviceMethod(url + "&download=true");

    const blobUrl = URL.createObjectURL(file.result);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();

    URL.revokeObjectURL(blobUrl);
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error downloading file:", error);
  } finally {
    setLoading(false);
  }
};

// const downloadCSV = (csvContent: any, name: string) => {
//   const blob = new Blob([csvContent], { type: "text/csv" });
//   const url = window.URL.createObjectURL(blob);
//   const a = document.createElement("a");
//   a.setAttribute("href", url);
//   a.setAttribute("download", `${name}.csv`);
//   document.body.appendChild(a);
//   a.click();
//   document.body.removeChild(a);
// };

const downloadCSV = (csvContent: any, name: string) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${name}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

function countValidFilters(filters: FilterObject): number {
  return Object.keys(filters).filter((key) => {
    const value = filters[key];
    return Array.isArray(value)
      ? value.length !== 0
      : value !== undefined && value !== "" && value !== " " && value !== null;
  }).length;
}

// New function to count individual filter values (not just fields)
function countIndividualFilters(filters: FilterObject): number {
  let count = 0;
  Object.keys(filters).forEach((key) => {
    const value = filters[key];
    if (Array.isArray(value)) {
      count += value.length;
    } else if (value !== undefined && value !== "" && value !== " " && value !== null) {
      count += 1;
    }
  });
  return count;
}


function generateFilterChips(filters: Record<string, any>) {
  const mapping: Record<string, string> = {
    company_name: "Company",
    company_names: "Company",
    institution_name: "Institution",
    fund_name: "Fund",
    year: "Year",
    vote: "Vote",
    vote_type: "Vote",
    vote_category: "Category",
    category: "Category",
    keyword: "Keyword",
    proposal: "Proposal",
    index: "Index",
    index_name: "Index",
    proposal_type: "Proposal Category",
    proponent_type: "Proponent",
    meeting_type: "Meeting Type",
    proposal_keyword: "Keywords",
    country: "Country",
    analyticsYear: "Year",
    date_range: "Date Range",
    themes: "Themes",
    market: "Country",
    sector: "Sector",
    region: "Region",
  };

  // Define the order of filters as they appear in the UI
  const filterOrder = [
    'institution_name',    // First row
    'fund_name',
    'vote_category',
    'proposal',            // Second row
    'vote',
    'keyword',
    'analyticsYear', 'year',
    'index_name', 'index',
    'date_range',
    'country',             
    'meeting_type',
    'proposal_type',
    'proponent_type',
    'vote_type',
    // Additional filters that might not be in the main form
    'company_name', 'company_names',
    'category',
    'proposal_keyword'
  ];

  // Create chips for each filter in the defined order
  const sortedChips: any[] = [];
  
  filterOrder.forEach(filterKey => {
    if (filters[filterKey] && filters[filterKey].length !== 0 && filters[filterKey] !== "") {
      const value = filters[filterKey];
      
      // Special handling for proposal_keyword - create separate chips for each keyword
      if (filterKey === 'proposal_keyword' && Array.isArray(value) && value.length > 0) {
        value.forEach((keyword) => {
          const keywordValue = typeof keyword === 'object' && keyword.label ? keyword.label : keyword;
          sortedChips.push({
            key: filterKey,
            label: `${mapping[filterKey] || filterKey}: ${keywordValue}`,
            value: keyword,
          });
        });
      } else if (Array.isArray(value)) {
        value.forEach((v) => {
          sortedChips.push({
            key: filterKey,
            label: `${mapping[filterKey] || filterKey}: ${typeof v === 'object' && v.label ? v.label : v}`,
            value: v,
          });
        });
      } else {
        sortedChips.push({
          key: filterKey,
          label: `${mapping[filterKey] || filterKey}: ${typeof value === 'object' && value.label ? value.label : value}`,
          value,
        });
      }
    }
  });

  // Add any remaining filters that weren't in the predefined order
  Object.entries(filters)
    .filter(([key, value]) => 
      !filterOrder.includes(key) && 
      value && 
      value.length !== 0 && 
      value !== ""
    )
    .forEach(([key, value]) => {
      // Special handling for proposal_keyword - create separate chips for each keyword
      if (key === 'proposal_keyword' && Array.isArray(value) && value.length > 0) {
        value.forEach((keyword) => {
          const keywordValue = typeof keyword === 'object' && keyword.label ? keyword.label : keyword;
          sortedChips.push({
            key,
            label: `${mapping[key] || key}: ${keywordValue}`,
            value: keyword,
          });
        });
      } else if (Array.isArray(value)) {
        value.forEach((v) => {
          sortedChips.push({
            key,
            label: `${mapping[key] || key}: ${typeof v === 'object' && v.label ? v.label : v}`,
            value: v,
          });
        });
      } else {
        sortedChips.push({
          key,
          label: `${mapping[key] || key}: ${typeof value === 'object' && value.label ? value.label : value}`,
          value,
        });
      }
    });

  return sortedChips;
}

function convertToTitleCase(str: string): string {
  if (!str) {
    return "";
  }
  if (str == "global_search" || str == "company_name" || str == "company_names") {
    return "Company"
  } else if (str == "institution_name") {
    return "Institution"
  }
  else if (str == "date_range") {
    return "Date Range"
  }
  else if (str == "proposal_type") {
    return "Proposal Category"
  }
  else if (str == "proponent_type") {
    return "Proponent"
  }
  else if (str == "country") {
    return "Country"
  }
  else if (str == "index") {
    return "Index"
  }
   else if (str == "index_name") {
    return "Index"
  }
  else if (str == "custom_keywords") {
    return "Keyword"
  }
  else if (str == "meeting_type") {
    return "Meeting Type"
  }
  else if (str == "analyticsYear") {
    return "Year"
  }
  else if (str == "proposal_keywords_mapping") {
    return "Proposal Keywords"
  }
  else if (str == "outcome_percentage") {
    return "Outcome Percentage"
  }

  return str
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/'\w/g, (match) => match.toLowerCase());
}

function updateQueryParams(params: { [key: string]: string }) {
  const url = new URL(window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  window.history.replaceState({}, "", url.toString());
}

const localStorageHelper = {
  setItem: (key: string, value: any) => {
    if (typeof value === "object") {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      localStorage.setItem(key, value);
    }
  },
  getItem: (key: string) => {
    const value = localStorage.getItem(key);
    try {
      return JSON.parse(value as any);
    } catch {
      return value;
    }
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
  },
};

const createQueryParams = (params: Record<string, any>) => {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        queryParams.append(key, JSON.stringify(value));
      }
    } else if (value !== null && value !== undefined && value !== "") {
      queryParams.append(key, value.toString());
    }
  });

  return queryParams.toString();
};

const downloadXlsxFile = ({
  data,
  fileName = "data.xlsx",
}: {
  data: any[];
  fileName: string;
}) => {
  // Transform each row so that the header keys are entirely in uppercase
  const transformedData = data.map((row) => {
    const newRow: Record<string, any> = {};
    Object.keys(row).forEach((key) => {
      const newKey = key.toUpperCase();
      newRow[newKey] = row[key];
    });
    return newRow;
  });

  const ws = XLSX.utils.json_to_sheet(transformedData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, fileName);
};

const downloadFileByServer = (blob: any, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename + '.xlsx';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}


const cleanObject = (obj: Record<string, any>) => {
  const cleaned: Record<string, any> = {};

  for (const key in obj) {
    const value = obj[key];
    if (!(typeof value === "string" && value.trim() === "")) {
      cleaned[key] = value;
    }
  }

  return cleaned;
};


const groupByValue = (array: any, key: string, isCompany: boolean, selectedGroup: any) => {
  const grouped = array.reduce((acc, note) => {
    const companyName = note[key];
    if (!acc[companyName]) {
      acc[companyName] = [];
    }
    acc[companyName].push(note);
    return acc;
  }, {});

  return Object.entries(grouped).map(([key, value]) => ({

    institution_id: isCompany
      ? value[0]?.institution
      : selectedGroup?.institution_id,
    company_id: isCompany ? selectedGroup?.company_id : value[0]?.company,
    institutionName: selectedGroup?.institutionName,
    companyName: selectedGroup?.companyName,
    name: key,
    data: value as any[],

  }));
};


export default localStorageHelper;

export {
  cutText,
  formatDate,
  capitalizeFirstLetter,
  onlyNumber,
  formatCurrency,
  timeAgo,
  diffTimeByNow,
  isset,
  toRaw,
  randomNumbers,
  toRGB,
  stringToHTML,
  slideUp,
  slideDown,
  getPageNumbers,
  createDynamicURL,
  getColorForCharacter,
  bytesToMB,
  getYearRange,
  formatedDate,
  filterMenu,
  downloadCSV,
  countValidFilters,
  countIndividualFilters,
  updateQueryParams,
  convertToTitleCase,
  createQueryParams,
  localStorageHelper,
  getDateWithoutTime,
  getCustomRelativeDate,
  downloadXlsxFile,
  downloadFileByServer,
  generateFilterChips,
  cleanObject,
  groupByValue,
  getCurrentYear,

};
