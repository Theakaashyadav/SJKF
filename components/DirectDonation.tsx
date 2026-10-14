import Image from "next/image";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpRight, Landmark, ScanLine } from "lucide-react";
import { organization } from "@/lib/site";

// Transcribed from the supplied bank statement; the statement itself is private.
const bankDetails = [
  { label: "Account holder", value: organization.name },
  { label: "Bank", value: "IDFC FIRST Bank" },
  { label: "Account number", value: "10294887830" },
  { label: "IFSC code", value: "IDFB0021041" },
  { label: "Branch", value: "Jewar Branch" },
  { label: "Account type", value: "Current Account" },
];

export function DirectDonation() {
  return (
    <section id="direct-donation" className="direct-donation" aria-labelledby="direct-donation-title">
      <div className="donation-title">
        <p className="eyebrow">Contribute directly</p>
        <h2 id="direct-donation-title">Give with confidence.</h2>
        <p>Scan the UPI QR code or make a bank transfer to support the foundation&apos;s work.</p>
      </div>
      <div className="direct-donation__grid">
        <article className="direct-donation__card donation-qr">
          <div className="direct-donation__heading"><ScanLine aria-hidden="true" /><div><p className="eyebrow">UPI donation</p><h3>Scan to donate</h3></div></div>
          <p>Scan with your UPI app and confirm the foundation&apos;s name before paying.</p>
          <div className="donation-qr__frame">
            <Image src="/images/donation-qr.jpeg" alt="UPI donation QR code for Swabhiman Jan Evam Pashu Kalyan Foundation" width={743} height={1280} sizes="(max-width: 560px) 90vw, 502px" />
          </div>
          <p className="donation-qr__payee">{organization.name}</p>
          <a className="button button--outline-dark donation-qr__download" href="/images/donation-qr.jpeg" download="swabhiman-foundation-donation-qr.jpeg"><ArrowDownToLine aria-hidden="true" />Save QR code</a>
        </article>

        <article className="direct-donation__card donation-bank">
          <div className="direct-donation__heading"><Landmark aria-hidden="true" /><div><p className="eyebrow">NEFT / IMPS / RTGS</p><h3>Bank transfer</h3></div></div>
          <p>Transfer your contribution directly to the foundation&apos;s bank account. All contributions are in Indian Rupees (INR).</p>
          <dl className="donation-bank__details">
            {bankDetails.map((detail) => <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}
          </dl>
        </article>
      </div>
      <div className="direct-donation__receipt">
        <p>After donating, share your transaction reference with the foundation to request an acknowledgement.</p>
        <Link href="/contact?interest=donation">Contact the foundation<ArrowUpRight aria-hidden="true" /></Link>
      </div>
    </section>
  );
}
