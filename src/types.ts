export type PaymentMethod = 'By Transfer' | 'By Cash' | 'By Barang' | '';

export interface VendorDonation {
  id: string; // Column NO
  vendorName: string; // Column VENDOR
  cb2025: number; // Column KONTRIBUSI CB 2025
  targetAmount: number; // Column TARGET
  proposalDate: string; // Column TGL. PROPOSAL
  sentDate: string; // Column SENT
  amount: number; // Column NILAI KOMITMEN
  paymentMethod: PaymentMethod; // Column PAID
  status: 'Pledge' | 'Confirmed' | 'Received'; // Internal status
  date: string; // Local timestamp
}

export interface DonationSummary {
  totalPledged: number;
  totalReceived: number;
  totalConfirmed: number;
  vendorCount: number;
  goal: number;
}
