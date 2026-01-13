import ExcelJS from "exceljs";

export const exportToExcel = async (data: any[], fileName: string) => {
  if (!data || data.length === 0) {
    alert("No data to export");
    return;
  }

  // 1. Create a new Workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Report");

  // 2. Define Columns based on the keys of the first object
  const columns = Object.keys(data[0]).map((key) => ({
    header: key,
    key: key,
    width: 20, // Set a default width for readability
  }));

  worksheet.columns = columns;

  // 3. Add Data
  worksheet.addRows(data);

  // 4. Style the Header Row (Optional: Make it bold)
  worksheet.getRow(1).font = { bold: true };

  // 5. Write to Buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // 6. Trigger Download using standard Browser API
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${fileName}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
};
