import moment from "moment";

/**
 * Format date for API calls — prevents timezone offset issues.
 *
 * Uses local date components so that the user's visible date is always sent,
 * regardless of timezone. Backend expects YYYY-MM-DD strings.
 */
export const formatDateForAPI = (date) => {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Format date for display using moment.
 * @param {string|Date} date
 * @param {"full"|"short"|"monthYear"|"api"} format
 */
export const formatDateDisplay = (date, format = "short") => {
  const m = moment(date);
  switch (format) {
    case "full":
      return m.format("MMMM D, YYYY");
    case "short":
      return m.format("MMM D, YYYY");
    case "monthYear":
      return m.format("MMMM YYYY");
    case "api":
      return m.format("YYYY-MM-DD");
    default:
      return m.format("MMM D, YYYY");
  }
};
