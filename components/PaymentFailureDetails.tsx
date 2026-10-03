"use client";

import { useEffect, useState } from "react";

export function PaymentFailureDetails() {
  const [details, setDetails] = useState<{ reference?: string; message?: string }>({});

  useEffect(() => {
    setDetails({
      reference: sessionStorage.getItem("payment-help") || undefined,
      message: sessionStorage.getItem("payment-error") || undefined,
    });
  }, []);

  if (!details.reference && !details.message) return null;
  return (
    <dl className="failure-details">
      {details.reference ? <div><dt>Payment reference</dt><dd>{details.reference}</dd></div> : null}
      {details.message ? <div><dt>Gateway message</dt><dd>{details.message}</dd></div> : null}
    </dl>
  );
}
