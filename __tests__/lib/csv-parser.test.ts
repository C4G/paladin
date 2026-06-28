import { describe, it, expect } from 'vitest';
import { parseCSV, generateCSVTemplate } from '@/lib/csv-parser';

describe('parseCSV', () => {
  it('parses a simple CSV with header', () => {
    const csv =
      'email,name,role\njohn@example.com,John Doe,MEMBER\njane@example.com,Jane Smith,MANAGER';
    const result = parseCSV(csv);

    expect(result.members).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.members[0]).toEqual({
      email: 'john@example.com',
      name: 'John Doe',
      role: 'MEMBER',
    });
    expect(result.members[1]).toEqual({
      email: 'jane@example.com',
      name: 'Jane Smith',
      role: 'MANAGER',
    });
  });

  it('parses CSV without header (emails only)', () => {
    const csv = 'john@example.com\njane@example.com';
    const result = parseCSV(csv);

    expect(result.members).toHaveLength(2);
    expect(result.members[0].email).toBe('john@example.com');
    expect(result.members[1].email).toBe('jane@example.com');
  });

  it('handles tab-delimited data', () => {
    const csv = 'email\tname\trole\njohn@example.com\tJohn\tOWNER';
    const result = parseCSV(csv);

    expect(result.members).toHaveLength(1);
    expect(result.members[0]).toEqual({
      email: 'john@example.com',
      name: 'John',
      role: 'OWNER',
    });
  });

  it('returns error for empty file', () => {
    const result = parseCSV('');
    expect(result.members).toHaveLength(0);
    expect(result.errors).toContain('File is empty');
  });

  it('returns error for invalid email', () => {
    const csv = 'email\nnot-an-email\njohn@example.com';
    const result = parseCSV(csv);

    expect(result.members).toHaveLength(1);
    expect(result.members[0].email).toBe('john@example.com');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Invalid email');
  });

  it('returns error for invalid role', () => {
    const csv = 'email,name,role\njohn@example.com,John,SUPERADMIN';
    const result = parseCSV(csv);

    expect(result.members).toHaveLength(0);
    expect(result.errors[0]).toContain('Invalid role');
  });

  it('deduplicates emails', () => {
    const csv = 'email\njohn@example.com\njohn@example.com';
    const result = parseCSV(csv);

    expect(result.members).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Duplicate email');
  });

  it('handles Windows line endings', () => {
    const csv =
      'email,name,role\r\njohn@example.com,John,MEMBER\r\njane@example.com,Jane,MANAGER\r\n';
    const result = parseCSV(csv);

    expect(result.members).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it('lowercases emails', () => {
    const csv = 'email\nJohn@Example.COM';
    const result = parseCSV(csv);

    expect(result.members[0].email).toBe('john@example.com');
  });

  it('skips blank lines', () => {
    const csv = 'email\n\njohn@example.com\n\n\njane@example.com\n';
    const result = parseCSV(csv);

    expect(result.members).toHaveLength(2);
  });

  it('requires email column when header is present', () => {
    const csv = 'name,role\nJohn,MEMBER';
    const result = parseCSV(csv);

    expect(result.members).toHaveLength(0);
    expect(result.errors[0]).toContain('email');
  });

  it('handles optional name and role columns', () => {
    const csv = 'email\njohn@example.com';
    const result = parseCSV(csv);

    expect(result.members).toHaveLength(1);
    expect(result.members[0].email).toBe('john@example.com');
    expect(result.members[0].name).toBeUndefined();
    expect(result.members[0].role).toBeUndefined();
  });
});

describe('generateCSVTemplate', () => {
  it('returns a valid CSV template', () => {
    const template = generateCSVTemplate();
    expect(template).toContain('email,name,role');
    expect(template).toContain('john@example.com');

    // Should be parsable
    const result = parseCSV(template);
    expect(result.members.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });
});
