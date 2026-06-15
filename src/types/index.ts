export type AccountType = 'Banco' | 'Local';

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  initialBalance: number;
  currentBalance: number;
}

export type CategoryType = 'Entrada' | 'Saída' | 'Transferência';

export interface Category {
  id: number;
  name: string;
  type: CategoryType;
}

export interface Transaction {
  id: number;
  date: string;
  value: number;
  description: string;
  type: CategoryType;
  accountId: number;
  destinationAccountId?: number;
  categoryId: number;
  customFields?: string;
}

export interface SignatureField {
  label: string;
  name: string;
}

export interface Settings {
  id: number;
  entityName: string;
  entityType: 'Empresa' | 'Igreja' | 'Pessoal';
  country: string;
  currency: string;
  profileImage?: string;
  customFieldsSchema?: string;
  printSettings?: string; // JSON: { showSignatures: boolean, signatures: SignatureField[] }
}

export interface CustomField {
  label: string;
  value: string;
}
