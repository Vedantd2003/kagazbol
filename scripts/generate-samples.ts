/**
 * One-time generator for the bundled sample documents in /public/samples.
 * Renders simple SVG "documents" to PNG so the demo has realistic-looking
 * (but fully fictional) bills/prescriptions/notices to try with one click.
 *
 * Usage: npm install -D sharp && npx tsx scripts/generate-samples.ts
 * (sharp is not a project dependency; install it temporarily to regenerate
 * the sample images, then remove it again.)
 */
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const OUT_DIR = join(process.cwd(), "public", "samples");
mkdirSync(OUT_DIR, { recursive: true });

const WIDTH = 1000;
const HEIGHT = 1400;

function page(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff" />
  <rect x="0" y="0" width="${WIDTH}" height="10" fill="#0f6e5e" />
  ${body}
</svg>`;
}

const FONT = "font-family='Arial, \"Noto Sans Devanagari\", sans-serif'";

const electricityBill = page(`
  <text x="60" y="90" ${FONT} font-size="34" font-weight="bold" fill="#0f6e5e">Maharashtra State Electricity Distribution Co. Ltd.</text>
  <text x="60" y="130" ${FONT} font-size="24" fill="#1f2937">महाराष्ट्र राज्य वीज वितरण कंपनी मर्यादित (MSEDCL)</text>
  <line x1="60" y1="155" x2="940" y2="155" stroke="#e8e1d4" stroke-width="2" />

  <text x="60" y="210" ${FONT} font-size="28" font-weight="bold" fill="#1f2937">Bill of Supply / वीज देयक</text>

  <text x="60" y="270" ${FONT} font-size="24" fill="#374151">Consumer Name:</text>
  <text x="380" y="270" ${FONT} font-size="24" font-weight="bold" fill="#111827">Ramesh Kumar Patil</text>

  <text x="60" y="315" ${FONT} font-size="24" fill="#374151">Consumer No:</text>
  <text x="380" y="315" ${FONT} font-size="24" fill="#111827">1234 5678 9012</text>

  <text x="60" y="360" ${FONT} font-size="24" fill="#374151">Address:</text>
  <text x="380" y="360" ${FONT} font-size="22" fill="#111827">Flat 12, Shivaji Nagar, Pune - 411005</text>

  <text x="60" y="405" ${FONT} font-size="24" fill="#374151">Billing Period:</text>
  <text x="380" y="405" ${FONT} font-size="24" fill="#111827">01 May 2026 - 31 May 2026</text>

  <text x="60" y="450" ${FONT} font-size="24" fill="#374151">Units Consumed:</text>
  <text x="380" y="450" ${FONT} font-size="24" fill="#111827">210 kWh</text>

  <text x="60" y="495" ${FONT} font-size="24" fill="#374151">Bill Date:</text>
  <text x="380" y="495" ${FONT} font-size="24" fill="#111827">05-06-2026</text>

  <rect x="60" y="540" width="880" height="120" rx="16" fill="#fdf3e7" />
  <text x="90" y="585" ${FONT} font-size="22" fill="#6b7280">Total Amount Payable / एकूण देय रक्कम</text>
  <text x="90" y="635" ${FONT} font-size="48" font-weight="bold" fill="#0f6e5e">Rs. 1,840.00</text>

  <rect x="60" y="690" width="880" height="100" rx="16" fill="#fdece9" />
  <text x="90" y="730" ${FONT} font-size="22" fill="#6b7280">Due Date / अंतिम तारीख</text>
  <text x="90" y="772" ${FONT} font-size="36" font-weight="bold" fill="#dc2626">21 June 2026</text>

  <text x="60" y="850" ${FONT} font-size="20" fill="#6b7280">A late payment surcharge of 2% will be applied if the bill is not paid by the due date.</text>
  <text x="60" y="885" ${FONT} font-size="20" fill="#6b7280">For complaints, call the toll-free helpline: 1800-102-3435.</text>

  <text x="60" y="1340" ${FONT} font-size="18" fill="#9ca3af">This is a computer-generated bill and does not require a signature. (Sample/fictional document for demo purposes.)</text>
`);

const prescription = page(`
  <text x="60" y="90" ${FONT} font-size="32" font-weight="bold" fill="#0f6e5e">Dr. Anjali Deshmukh, MBBS, MD (Medicine)</text>
  <text x="60" y="130" ${FONT} font-size="24" fill="#1f2937">Sunrise Family Clinic, FC Road, Pune</text>
  <text x="60" y="165" ${FONT} font-size="20" fill="#6b7280">Reg. No. MH-998877  |  Phone: 020-12345678</text>
  <line x1="60" y1="190" x2="940" y2="190" stroke="#e8e1d4" stroke-width="2" />

  <text x="60" y="245" ${FONT} font-size="24" fill="#374151">Date:</text>
  <text x="200" y="245" ${FONT} font-size="24" font-weight="bold" fill="#111827">08 June 2026</text>

  <text x="60" y="290" ${FONT} font-size="24" fill="#374151">Patient Name:</text>
  <text x="280" y="290" ${FONT} font-size="24" font-weight="bold" fill="#111827">सुनिता राव (Sunita Rao)</text>

  <text x="60" y="335" ${FONT} font-size="24" fill="#374151">Age / Gender:</text>
  <text x="280" y="335" ${FONT} font-size="24" fill="#111827">58 years / Female</text>

  <text x="60" y="395" ${FONT} font-size="30" font-weight="bold" fill="#0f6e5e">Rx</text>
  <line x1="60" y1="410" x2="940" y2="410" stroke="#e8e1d4" stroke-width="2" />

  <text x="80" y="460" ${FONT} font-size="24" fill="#111827">1. Tab. Metformin 500mg</text>
  <text x="100" y="495" ${FONT} font-size="20" fill="#6b7280">1 tablet morning - 0 - 1 tablet night, after food, for 30 days</text>

  <text x="80" y="555" ${FONT} font-size="24" fill="#111827">2. Tab. Amlodipine 5mg</text>
  <text x="100" y="590" ${FONT} font-size="20" fill="#6b7280">1 tablet every morning, for 30 days</text>

  <text x="80" y="650" ${FONT} font-size="24" fill="#111827">3. Cap. Pantoprazole 40mg</text>
  <text x="100" y="685" ${FONT} font-size="20" fill="#6b7280">1 capsule before breakfast, empty stomach, for 30 days</text>

  <rect x="60" y="740" width="880" height="160" rx="16" fill="#eef6f4" />
  <text x="90" y="785" ${FONT} font-size="22" font-weight="bold" fill="#0f6e5e">Advice</text>
  <text x="90" y="825" ${FONT} font-size="22" fill="#374151">- Low salt, low sugar diet</text>
  <text x="90" y="860" ${FONT} font-size="22" fill="#374151">- 30 minutes brisk walk daily</text>
  <text x="90" y="895" ${FONT} font-size="22" fill="#374151">- Check fasting blood sugar before next visit</text>

  <rect x="60" y="930" width="880" height="100" rx="16" fill="#fdf3e7" />
  <text x="90" y="970" ${FONT} font-size="22" fill="#6b7280">Follow-up Date</text>
  <text x="90" y="1010" ${FONT} font-size="32" font-weight="bold" fill="#0f6e5e">08 July 2026</text>

  <text x="60" y="1340" ${FONT} font-size="18" fill="#9ca3af">Sample/fictional prescription for demo purposes only. Not for actual medical use.</text>
`);

const bankNotice = page(`
  <text x="60" y="90" ${FONT} font-size="34" font-weight="bold" fill="#0f6e5e">Bank of Maharashtra</text>
  <text x="60" y="130" ${FONT} font-size="22" fill="#1f2937">FC Road Branch, Pune - 411004</text>
  <line x1="60" y1="155" x2="940" y2="155" stroke="#e8e1d4" stroke-width="2" />

  <text x="60" y="210" ${FONT} font-size="26" font-weight="bold" fill="#1f2937">Subject: Minimum Balance Shortfall Notice</text>
  <text x="60" y="250" ${FONT} font-size="22" fill="#6b7280">सूचना: न्यूनतम शिल्लक रकमेची कमतरता</text>

  <text x="60" y="310" ${FONT} font-size="24" fill="#374151">Account Holder:</text>
  <text x="380" y="310" ${FONT} font-size="24" font-weight="bold" fill="#111827">Vikram Joshi</text>

  <text x="60" y="355" ${FONT} font-size="24" fill="#374151">Account Number:</text>
  <text x="380" y="355" ${FONT} font-size="24" fill="#111827">XXXXXXXX4521 (Savings)</text>

  <text x="60" y="400" ${FONT} font-size="24" fill="#374151">Notice Date:</text>
  <text x="380" y="400" ${FONT} font-size="24" fill="#111827">09 June 2026</text>

  <text x="60" y="470" ${FONT} font-size="22" fill="#374151" >Dear Customer, your account balance has fallen below the</text>
  <text x="60" y="505" ${FONT} font-size="22" fill="#374151">required Average Monthly Balance (AMB) of Rs. 10,000.</text>

  <rect x="60" y="550" width="880" height="120" rx="16" fill="#fdece9" />
  <text x="90" y="595" ${FONT} font-size="22" fill="#6b7280">Penalty if balance is not restored / दंड शुल्क</text>
  <text x="90" y="645" ${FONT} font-size="44" font-weight="bold" fill="#dc2626">Rs. 590.00</text>

  <rect x="60" y="690" width="880" height="100" rx="16" fill="#fdf3e7" />
  <text x="90" y="730" ${FONT} font-size="22" fill="#6b7280">Restore balance before / अंतिम तारीख</text>
  <text x="90" y="772" ${FONT} font-size="36" font-weight="bold" fill="#0f6e5e">30 June 2026</text>

  <text x="60" y="850" ${FONT} font-size="20" fill="#6b7280">To avoid this penalty, please deposit funds to bring your balance above</text>
  <text x="60" y="880" ${FONT} font-size="20" fill="#6b7280">Rs. 10,000 before the date mentioned above. Visit your nearest branch or use</text>
  <text x="60" y="910" ${FONT} font-size="20" fill="#6b7280">net banking / mobile banking to transfer funds.</text>

  <text x="60" y="1340" ${FONT} font-size="18" fill="#9ca3af">This is a sample/fictional notice for demo purposes only.</text>
`);

const docs: { name: string; svg: string }[] = [
  { name: "electricity-bill.png", svg: electricityBill },
  { name: "prescription.png", svg: prescription },
  { name: "bank-notice.png", svg: bankNotice },
];

async function main() {
  for (const doc of docs) {
    const png = await sharp(Buffer.from(doc.svg)).png().toBuffer();
    writeFileSync(join(OUT_DIR, doc.name), png);
    console.log(`Wrote ${doc.name} (${png.length} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
