export interface ParsedMember {
  email: string;
  name?: string;
  role?: string;
}

export interface CSVParseResult {
  members: ParsedMember[];
  errors: string[];
}

/**
 * Parse CSV text into member entries.
 * Accepts formats:
 *   - With header row: email,name,role
 *   - Without header row (auto-detected): just email per line
 *   - Tab or comma delimited
 */
export function parseCSV(text: string): CSVParseResult {
  const members: ParsedMember[] = [];
  const errors: string[] = [];

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    errors.push('File is empty');
    return { members, errors };
  }

  // Detect delimiter: tab or comma
  const delimiter = lines[0].includes('\t') ? '\t' : ',';

  // Check if first row is a header
  const firstRow = lines[0].toLowerCase();
  const hasHeader =
    firstRow.includes('email') ||
    firstRow.includes('name') ||
    firstRow.includes('role');

  let columnMap: Record<string, number> = { email: 0, name: 1, role: 2 };

  const startIndex = hasHeader ? 1 : 0;

  if (hasHeader) {
    const headers = lines[0]
      .split(delimiter)
      .map((h) => h.trim().toLowerCase());
    const emailIdx = headers.findIndex((h) => h === 'email');
    const nameIdx = headers.findIndex(
      (h) => h === 'name' || h === 'full name' || h === 'fullname'
    );
    const roleIdx = headers.findIndex((h) => h === 'role');

    if (emailIdx === -1) {
      errors.push('CSV header must include an "email" column');
      return { members, errors };
    }

    columnMap = {
      email: emailIdx,
      name: nameIdx,
      role: roleIdx,
    };
  }

  for (let i = startIndex; i < lines.length; i++) {
    const columns = lines[i].split(delimiter).map((c) => c.trim());
    const lineNum = i + 1;

    const email = columns[columnMap.email]?.toLowerCase();
    if (!email) {
      errors.push(`Row ${lineNum}: Missing email`);
      continue;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Row ${lineNum}: Invalid email "${email}"`);
      continue;
    }

    const name =
      columnMap.name >= 0 ? columns[columnMap.name] || undefined : undefined;
    const role =
      columnMap.role >= 0 ? columns[columnMap.role] || undefined : undefined;

    if (role) {
      const upperRole = role.toUpperCase();
      if (!['OWNER', 'MANAGER', 'MEMBER'].includes(upperRole)) {
        errors.push(
          `Row ${lineNum}: Invalid role "${role}". Must be OWNER, MANAGER, or MEMBER`
        );
        continue;
      }
    }

    members.push({ email, name, role });
  }

  // Check for duplicate emails
  const seen = new Set<string>();
  const deduped: ParsedMember[] = [];
  for (const member of members) {
    if (seen.has(member.email)) {
      errors.push(`Duplicate email "${member.email}" — using first occurrence`);
    } else {
      seen.add(member.email);
      deduped.push(member);
    }
  }

  return { members: deduped, errors };
}

/**
 * Generate a sample CSV template for downloading
 */
export function generateCSVTemplate(): string {
  return 'email,name,role\njohn@example.com,John Doe,MEMBER\njane@example.com,Jane Smith,MANAGER\nbob@example.com,Bob Johnson,OWNER\nalice@example.com,Alice Williams,MEMBER\ncharlie@example.com,Charlie Brown,MEMBER\n';
}

const FIRST_NAMES = [
  'James',
  'Mary',
  'Robert',
  'Patricia',
  'John',
  'Jennifer',
  'Michael',
  'Linda',
  'David',
  'Elizabeth',
  'William',
  'Barbara',
  'Richard',
  'Susan',
  'Joseph',
  'Jessica',
  'Thomas',
  'Sarah',
  'Christopher',
  'Karen',
  'Charles',
  'Lisa',
  'Daniel',
  'Nancy',
  'Matthew',
  'Betty',
  'Anthony',
  'Margaret',
  'Mark',
  'Sandra',
  'Donald',
  'Ashley',
  'Steven',
  'Dorothy',
  'Andrew',
  'Kimberly',
  'Paul',
  'Emily',
  'Joshua',
  'Donna',
  'Kenneth',
  'Michelle',
  'Kevin',
  'Carol',
  'Brian',
  'Amanda',
  'George',
  'Melissa',
  'Timothy',
  'Deborah',
  'Ronald',
  'Stephanie',
  'Edward',
  'Rebecca',
  'Jason',
  'Sharon',
  'Jeffrey',
  'Laura',
  'Ryan',
  'Cynthia',
  'Jacob',
  'Kathleen',
  'Gary',
  'Amy',
  'Nicholas',
  'Angela',
  'Eric',
  'Shirley',
  'Jonathan',
  'Anna',
  'Stephen',
  'Brenda',
];

const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
  'Walker',
  'Young',
  'Allen',
  'King',
  'Wright',
  'Scott',
  'Torres',
  'Nguyen',
  'Hill',
  'Flores',
  'Green',
  'Adams',
  'Nelson',
  'Baker',
  'Hall',
  'Rivera',
  'Campbell',
  'Mitchell',
  'Carter',
  'Roberts',
  'Gomez',
  'Phillips',
  'Evans',
  'Turner',
  'Diaz',
];

const DOMAINS = [
  'farmcoop.org',
  'agriworks.com',
  'greenfields.net',
  'harvestco.com',
  'ranchlands.org',
  'cropwise.com',
  'fieldops.net',
  'growmore.com',
];

/**
 * Generate a sample CSV with the given number of realistic entries
 */
function generateCSVSample(count: number): string {
  const roles = ['MEMBER', 'MEMBER', 'MEMBER', 'MEMBER', 'MANAGER'];
  const lines = ['email,name,role'];

  for (let i = 0; i < count; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[i % LAST_NAMES.length];
    const domain = DOMAINS[i % DOMAINS.length];
    const suffix =
      i < FIRST_NAMES.length * LAST_NAMES.length
        ? ''
        : `${Math.floor(i / (FIRST_NAMES.length * LAST_NAMES.length))}`;
    const email = `${first.toLowerCase()}.${last.toLowerCase()}${suffix}@${domain}`;
    const role = roles[i % roles.length];
    lines.push(`${email},${first} ${last},${role}`);
  }

  return lines.join('\n') + '\n';
}

export function generateLargeCSVSample(): string {
  return generateCSVSample(1000);
}

export function generate10kCSVSample(): string {
  return generateCSVSample(10000);
}

export function generate50kCSVSample(): string {
  return generateCSVSample(50000);
}
