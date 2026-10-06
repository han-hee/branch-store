import { createClient } from '@supabase/supabase-js';
import { SaleRecord } from '@/types/sales';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface RawSaleRow {
  id?: number;
  월: string;
  지점: string;
  매출액: number;
  객수: number;
  비고: string | null;
  created_at?: string;
}

export function toSaleRecord(row: RawSaleRow): SaleRecord {
  return {
    id: row.id,
    month: row.월,
    branchName: row.지점,
    salesAmount: Number(row.매출액),
    customerCount: Number(row.객수),
    notes: row.비고,
    createdAt: row.created_at,
  };
}

export function toRawSaleRow(record: SaleRecord): Omit<RawSaleRow, 'id' | 'created_at'> {
  return {
    월: record.month,
    지점: record.branchName,
    매출액: Math.round(record.salesAmount),
    객수: Math.round(record.customerCount),
    비고: record.notes && record.notes.trim() !== '' ? record.notes.trim() : null,
  };
}

// Fetch all sales records ordered by month and branch
export async function getSales(): Promise<{ data: SaleRecord[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('월', { ascending: true })
      .order('지점', { ascending: true });

    if (error) {
      console.error('Error fetching sales:', error);
      return { data: null, error: error.message };
    }

    const records = (data as RawSaleRow[]).map(toSaleRecord);
    return { data: records, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { data: null, error: message };
  }
}

// Insert or update a sale record
export async function saveSaleRecord(record: SaleRecord): Promise<{ success: boolean; error: string | null }> {
  try {
    const payload = toRawSaleRow(record);

    // Check if a record already exists for the same month and branch
    const { data: existing } = await supabase
      .from('sales')
      .select('id')
      .eq('월', record.month)
      .eq('지점', record.branchName)
      .maybeSingle();

    if (existing && existing.id) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('sales')
        .update(payload)
        .eq('id', existing.id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('sales')
        .insert([payload]);

      if (insertError) {
        return { success: false, error: insertError.message };
      }
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}
