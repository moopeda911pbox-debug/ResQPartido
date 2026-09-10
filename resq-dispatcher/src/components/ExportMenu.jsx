import React, { useEffect, useRef, useState } from "react";
import { Download, FileText, FileSpreadsheet, ChevronDown } from "lucide-react";

export default function ExportMenu({ onExportPdf, onExportExcel, label = "Export" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="export-menu" ref={ref}>
      <button type="button" className="btn-mini" onClick={() => setOpen((o) => !o)}>
        <Download size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
        {label}
        <ChevronDown size={12} style={{ verticalAlign: -2, marginLeft: 4 }} />
      </button>
      {open && (
        <div className="export-menu-dropdown">
          <button
            type="button"
            onClick={() => {
              onExportPdf();
              setOpen(false);
            }}
          >
            <FileText size={13} /> Download PDF
          </button>
          <button
            type="button"
            onClick={() => {
              onExportExcel();
              setOpen(false);
            }}
          >
            <FileSpreadsheet size={13} /> Download Spreadsheet
          </button>
        </div>
      )}
    </div>
  );
}
