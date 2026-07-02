export type UserRole = "ADMIN" | "MEMBER";
export type ExpenseSplitType = "EQUAL" | "AMOUNT";
export type ExpenseStatus = "ACTIVE" | "CANCELLED";
export type SettlementStatus = "PENDING" | "PAID";

export interface User {
  id: number;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserOption {
  id: number;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
  active: boolean;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  user: User;
}

export interface ExpenseShare {
  userId: number;
  fullName: string;
  avatarUrl: string | null;
  shareAmount: number;
}

export interface Expense {
  id: number;
  amount: number;
  description: string;
  imageUrl: string | null;
  expenseDate: string;
  splitType: ExpenseSplitType;
  status: ExpenseStatus;
  payerId: number;
  payerName: string;
  createdById: number;
  createdByName: string;
  shares: ExpenseShare[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardResponse {
  greetingName: string;
  monthTotal: number;
  todayTotal: number;
  monthExpenseCount: number;
  topPayerName: string | null;
  topPayerAmount: number;
  recentExpenses: Expense[];
}

export interface MemberReportItem {
  userId: number;
  fullName: string;
  avatarUrl: string | null;
  paidAmount: number;
  shareAmount: number;
  balance: number;
}

export interface SettlementSuggestion {
  fromUserId: number;
  fromUserName: string;
  toUserId: number;
  toUserName: string;
  amount: number;
}

export interface MonthlyReport {
  month: number;
  year: number;
  totalExpenseAmount: number;
  totalExpenseCount: number;
  members: MemberReportItem[];
  suggestions: SettlementSuggestion[];
}

export interface Settlement {
  id: number;
  fromUserId: number;
  fromUserName: string;
  toUserId: number;
  toUserName: string;
  amount: number;
  month: number;
  year: number;
  status: SettlementStatus;
  paidAt: string | null;
  createdAt: string;
}

export interface ExpenseShareInput {
  userId: number;
  shareAmount?: number;
}

export interface ExpensePayload {
  payerId: number;
  amount: number;
  description: string;
  imageUrl?: string;
  expenseDate: string;
  splitType: ExpenseSplitType;
  shares: ExpenseShareInput[];
}
