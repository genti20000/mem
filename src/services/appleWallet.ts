import JSZip from 'jszip';
import { Member } from '../types';

/**
 * Calculates SHA-1 hex hash of a string or buffer for Apple Wallet manifest.json
 */
async function sha1(data: string | Uint8Array): Promise<string> {
  const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-1', buffer as unknown as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates an offscreen canvas rendering of the Jonny's logo for Apple Wallet pass
 */
function createPassImageBlob(
  text: string,
  width: number,
  height: number,
  isIcon = false
): Promise<Uint8Array> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve(new Uint8Array(0));
      return;
    }

    // Background
    if (isIcon) {
      ctx.fillStyle = '#111113';
      ctx.fillRect(0, 0, width, height);

      // Gold circle
      ctx.strokeStyle = '#C6A052';
      ctx.lineWidth = Math.max(2, width * 0.05);
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, width * 0.4, 0, Math.PI * 2);
      ctx.stroke();

      // "J" letter
      ctx.fillStyle = '#E5C378';
      ctx.font = `bold ${Math.floor(height * 0.55)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('J', width / 2, height / 2 + 2);
    } else {
      // Logo banner: transparent with gold typography
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#C6A052';
      ctx.font = `bold ${Math.floor(height * 0.58)}px "Oswald", sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 4, height / 2);
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(new Uint8Array(0));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        resolve(new Uint8Array(reader.result as ArrayBuffer));
      };
      reader.readAsArrayBuffer(blob);
    }, 'image/png');
  });
}

/**
 * Builds Apple PassKit JSON structure for Jonny's Soho member card
 */
export function buildPassJson(member: Member, qrToken: string) {
  const memberSinceYear = new Date(member.appliedAt).getFullYear();

  return {
    formatVersion: 1,
    passTypeIdentifier: 'pass.com.jonnys.soho.membership',
    serialNumber: member.memberNumber || member.id,
    teamIdentifier: '725278496947',
    webServiceURL: 'https://ais-dev-kak4pjedeos3sbwqjczr43-169035586469.europe-west2.run.app/api/passes/',
    authenticationToken: 'vxw1234567890abcdef',
    organizationName: "Jonny's Soho",
    description: "Jonny's Private Members Club Pass · 23 Frith Street",
    logoText: "JONNY'S",
    foregroundColor: 'rgb(242, 242, 242)',
    backgroundColor: 'rgb(17, 17, 19)',
    labelColor: 'rgb(198, 160, 82)',
    storeCard: {
      headerFields: [
        {
          key: 'venue',
          label: '23 FRITH STREET',
          value: 'MEMBER PASS',
        },
      ],
      primaryFields: [
        {
          key: 'member-name',
          label: 'MEMBER',
          value: member.fullName,
        },
      ],
      secondaryFields: [
        {
          key: 'member-id',
          label: 'MEMBER NO.',
          value: member.memberNumber,
        },
        {
          key: 'status',
          label: 'STATUS',
          value: member.status.toUpperCase().replace('_', ' '),
        },
      ],
      auxiliaryFields: [
        {
          key: 'role',
          label: 'SOHO HOSPITALITY AFFILIATION',
          value: `${member.hospitalityRole} · ${member.employer}`,
        },
        {
          key: 'guests',
          label: 'GUEST ENTITLEMENT',
          value: 'Max 2 Late Guests',
        },
        {
          key: 'since',
          label: 'MEMBER SINCE',
          value: `${memberSinceYear}`,
        },
      ],
      backFields: [
        {
          key: 'admissions',
          label: 'WESTMINSTER LICENSING REGULATIONS',
          value:
            'Admissions after 01:00 AM are strictly limited to verified members and their registered guests. Maximum 2 guests per member. Maximum licensed capacity strictly capped at 80 patrons.',
        },
        {
          key: 'curfew',
          label: '01:30 AM HARD CUT-OFF',
          value:
            'No new admissions or guest registrations after 01:30 AM. Only returning terrace smokers with valid stamps may re-enter.',
        },
        {
          key: 'address',
          label: 'VENUE ADDRESS',
          value: "Jonny's Members Club, 23 Frith Street, Soho, London W1D 4RR",
        },
        {
          key: 'conduct',
          label: 'HOUSE CODE & DRESS',
          value:
            'Smart casual attire. Discretion expected. Please depart quietly out of respect for local Soho residents.',
        },
        {
          key: 'contact',
          label: 'DOOR & ENQUIRIES',
          value: 'reception@jonnys-soho.co.uk · Direct Door Desk: +44 (0)20 7437 2300',
        },
        {
          key: 'eligibility',
          label: 'STATUTORY 48-HOUR RULE',
          value:
            'Membership privileges require a mandatory 48-hour statutory waiting period under the Licensing Act 2003 before first admission.',
        },
      ],
    },
    barcodes: [
      {
        format: 'PKBarcodeFormatQR',
        message: qrToken || member.memberNumber,
        messageEncoding: 'iso-8859-1',
        altText: `${member.memberNumber} · Dynamic QR Code`,
      },
    ],
  };
}

/**
 * Packages a valid Apple Wallet .pkpass ZIP bundle with images and manifest
 */
export async function generateAppleWalletPassBundle(
  member: Member,
  qrToken: string
): Promise<Blob> {
  const zip = new JSZip();

  const passJsonObj = buildPassJson(member, qrToken);
  const passJsonStr = JSON.stringify(passJsonObj, null, 2);

  // Generate PNG image assets
  const iconPng = await createPassImageBlob('J', 58, 58, true);
  const icon2xPng = await createPassImageBlob('J', 116, 116, true);
  const logoPng = await createPassImageBlob("JONNY'S", 240, 80, false);
  const logo2xPng = await createPassImageBlob("JONNY'S", 480, 160, false);

  // Manifest containing SHA-1 hashes of pass contents
  const manifest: Record<string, string> = {
    'pass.json': await sha1(passJsonStr),
    'icon.png': await sha1(iconPng),
    'icon@2x.png': await sha1(icon2xPng),
    'logo.png': await sha1(logoPng),
    'logo@2x.png': await sha1(logo2xPng),
  };

  const manifestStr = JSON.stringify(manifest, null, 2);

  // Add files to ZIP
  zip.file('pass.json', passJsonStr);
  zip.file('manifest.json', manifestStr);
  zip.file('icon.png', iconPng);
  zip.file('icon@2x.png', icon2xPng);
  zip.file('logo.png', logoPng);
  zip.file('logo@2x.png', logo2xPng);

  // Generate .pkpass Blob with PassKit MIME type
  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.apple.pkpass',
  });
}

/**
 * Triggers a download of the .pkpass file on the client
 */
export async function downloadAppleWalletPass(
  member: Member,
  qrToken: string
): Promise<void> {
  const blob = await generateAppleWalletPassBundle(member, qrToken);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jonnys-pass-${member.memberNumber || 'member'}.pkpass`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Generates email content for dispatching the pass to a member
 */
export function generateMemberPassEmail(
  member: Member,
  qrToken: string,
  venueUrl = window.location.origin
) {
  const subject = `Your JONNY’S Soho Digital Membership Pass · ${member.memberNumber}`;
  const passUrl = `${venueUrl}?tab=cards&member=${encodeURIComponent(member.id)}`;

  const body = `Dear ${member.fullName},

Your digital membership pass for JONNY’S (23 Frith Street, Soho) is active and ready for your next visit.

==============================================
JONNY’S SOHO · PRIVATE MEMBERS PASS
==============================================
Member: ${member.fullName}
Pass Number: ${member.memberNumber}
Hospitality Role: ${member.hospitalityRole} at ${member.employer}
Status: ${member.status.toUpperCase()}
Guest Privilege: Up to 2 guests after 01:00 AM (Subject to 80-capacity limit)

ACCESS YOUR DIGITAL PASS & ADD TO APPLE WALLET:
${passUrl}

WESTMINSTER CITY COUNCIL LICENSING SCHEDULE:
- 01:00 AM: Post-1am admission restricted strictly to members and bona fide guests.
- 01:30 AM: Admissions cut-off curfew. No new entries permitted. Returning terrace smokers only.
- Strict 80-person venue capacity applies at all times.

Present your live rotating pass QR code at the 23 Frith Street reception kiosk upon arrival.

Warm regards,
Reception & Membership Office
JONNY’S · 23 Frith Street, Soho, London W1D 4RR
`;

  return { subject, body, passUrl };
}
