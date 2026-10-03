"use client";

import { Printer } from "lucide-react";

export function PrintReceiptButton() {
  return <button type="button" className="button button--green no-print" onClick={() => window.print()}><Printer />Print acknowledgement</button>;
}
