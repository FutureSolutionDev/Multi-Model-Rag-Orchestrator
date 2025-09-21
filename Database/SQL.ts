import mysql from 'mysql2/promise';
export interface CustomerRow {
  CustomerId: number;
  CustomerName?: string | null;
  Phone?: string | null;
  Email?: string | null;
  Notes?: string | null;
  CustomerBranchId?: number | null;
  CreatedAt?: Date | null;
  UpdatedAt?: Date | null;
}
export interface ContractRow {
  ContractId: number;
  ContractCustomerId: number;
  ContractType?: string | null;
  StartDate?: Date | null;
  EndDate?: Date | null;
  MonthlyFee?: number | null;
  Status?: string | null;
}
export interface HistoryRow {
  HistoryId: number;
  HistoryContractId: number;
  HistoryPosition: string;
  HistoryDate: Date;
  HistoryNotes?: string | null;
}
export interface InvoiceRow {
  InvoiceId: number;
  CustomerId: number;
  ContractId?: number | null;
  InvoiceNumber?: string | null;
  InvoiceDate: Date;
  DueDate: Date;
  Status?: string | null;
  Amount?: number | null;
}

function dsn() {
  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASS || '';
  const database = process.env.DB_NAME || '';
  return { host, port, user, password, database };
}

export async function getCustomerBundle(customerId: number) {
  const pool = await mysql.createPool({ ...dsn(), waitForConnections: true, connectionLimit: 8 });
  try {
    const [customers] = await pool.query('SELECT * FROM Customers WHERE CustomerId=?', [customerId]);
    const [contracts]  = await pool.query('SELECT * FROM Contracts WHERE ContractCustomerId=?', [customerId]);
    const [histories]  = await pool.query('SELECT h.* FROM ContractHistories h JOIN Contracts c ON c.ContractId = h.HistoryContractId WHERE c.ContractCustomerId=? ORDER BY h.HistoryDate DESC', [customerId]);
    const [invoices]   = await pool.query('SELECT * FROM Invoices WHERE CustomerId=? ORDER BY DueDate DESC', [customerId]);
    const customer = (customers as any[])[0] as CustomerRow | undefined;
    return {
      customer,
      contracts: contracts as ContractRow[],
      histories: histories as HistoryRow[],
      invoices: invoices as InvoiceRow[],
    };
  } finally {
    pool.end();
  }
}

export async function getAllCustomerIds(): Promise<number[]> {
  const pool = await mysql.createPool({ ...dsn(), waitForConnections: true, connectionLimit: 8 });
  try {
    const [rows] = await pool.query('SELECT CustomerId FROM Customers');
    return (rows as any[]).map(r => Number(r.CustomerId)).filter(Boolean);
  } finally { pool.end(); }
}