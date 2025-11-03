import { db } from '../database';

// Supabase returns snake_case from database, not camelCase types
// Using simple interfaces that match actual database responses
interface WalletRow {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  total_points: number;
  metadata: any;
}

interface MerchantConfigRow {
  id: string;
  created_at: string;
  updated_at: string;
  organizer_id: string;
  issue_rate_per_dollar: number;
  redeem_cap_percentage: number;
  point_bank_included: number;
  point_bank_purchased: number;
  subscription_tier: string;
  subscription_status: string;
}

interface LedgerRow {
  id: string;
  created_at: string;
  user_id: string;
  organizer_id: string;
  type: 'mint' | 'burn';
  points: number;
  cents_value: number | null;
  bucket_used: string | null;
  reference: string | null;
  reversed_of: string | null;
  metadata: any;
}

interface UserMerchantEarningRow {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  organizer_id: string;
  total_earned: number;
}

// ===== WALLET OPERATIONS =====

/**
 * Get wallet by user ID
 */
export async function getWalletByUserId(userId: string): Promise<WalletRow | null> {
  const { data, error } = await db
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data;
}

/**
 * Create a new wallet for a user
 */
export async function createWallet(userId: string): Promise<WalletRow> {
  const { data, error } = await db
    .from('wallets')
    .insert({
      user_id: userId,
      total_points: 0,
      metadata: {},
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get or create wallet (convenience method)
 */
export async function getOrCreateWallet(userId: string): Promise<WalletRow> {
  let wallet = await getWalletByUserId(userId);
  
  if (!wallet) {
    wallet = await createWallet(userId);
  }

  return wallet;
}

/**
 * Update wallet points balance
 */
export async function updateWalletBalance(
  walletId: string, 
  newBalance: number
): Promise<WalletRow> {
  const { data, error } = await db
    .from('wallets')
    .update({
      total_points: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', walletId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ===== MERCHANT CONFIG OPERATIONS =====

/**
 * Get merchant loyalty config by organizer ID
 */
export async function getMerchantConfig(organizerId: string): Promise<MerchantConfigRow | null> {
  const { data, error } = await db
    .from('merchant_loyalty_config')
    .select('*')
    .eq('organizer_id', organizerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data;
}

/**
 * Create merchant loyalty config (auto-provisioned during beta)
 */
export async function createMerchantConfig(organizerId: string): Promise<MerchantConfigRow> {
  const { data, error } = await db
    .from('merchant_loyalty_config')
    .insert({
      organizer_id: organizerId,
      issue_rate_per_dollar: 50, // Default: 50 JP per $1
      redeem_cap_percentage: 20, // Default: 20% max redemption
      point_bank_included: 20000, // 20k JP included during beta
      point_bank_purchased: 0,
      subscription_tier: 'starter',
      subscription_status: 'beta-free',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update merchant config settings
 */
export async function updateMerchantConfig(
  configId: string,
  updates: {
    issue_rate_per_dollar?: number;
    redeem_cap_percentage?: number;
    point_bank_included?: number;
    point_bank_purchased?: number;
  }
): Promise<MerchantConfigRow> {
  const { data, error } = await db
    .from('merchant_loyalty_config')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', configId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ===== LEDGER OPERATIONS =====

/**
 * Create a ledger entry (mint or burn)
 */
export async function createLedgerEntry(entry: {
  userId: string;
  organizerId: string;
  type: 'mint' | 'burn';
  points: number;
  centsValue?: number;
  bucketUsed?: string;
  reference?: string;
  metadata?: any;
}): Promise<LedgerRow> {
  const { data, error } = await db
    .from('loyalty_ledger')
    .insert({
      user_id: entry.userId,
      organizer_id: entry.organizerId,
      type: entry.type,
      points: entry.points,
      cents_value: entry.centsValue,
      bucket_used: entry.bucketUsed,
      reference: entry.reference,
      metadata: entry.metadata || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get user's transaction history
 */
export async function getUserTransactions(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Array<LedgerRow & { business_name?: string }>> {
  const { data, error } = await db
    .from('loyalty_ledger')
    .select(`
      *,
      organizers:organizer_id (
        business_name
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  
  // Flatten the nested organizers data
  return (data || []).map((tx: any) => ({
    ...tx,
    business_name: tx.organizers?.business_name,
  }));
}

// ===== USER-MERCHANT EARNINGS =====

/**
 * Get user's earnings breakdown by merchant
 */
export async function getUserMerchantEarnings(
  userId: string
): Promise<Array<UserMerchantEarningRow & { business_name?: string }>> {
  const { data, error } = await db
    .from('user_merchant_earnings')
    .select(`
      *,
      organizers:organizer_id (
        business_name
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;
  
  // Flatten the nested organizers data
  return (data || []).map((earning: any) => ({
    ...earning,
    business_name: earning.organizers?.business_name,
  }));
}

/**
 * Get or create user-merchant earnings record
 */
export async function getOrCreateUserMerchantEarnings(
  userId: string,
  organizerId: string
): Promise<UserMerchantEarningRow> {
  // Try to get existing
  const { data: existing, error: getError } = await db
    .from('user_merchant_earnings')
    .select('*')
    .eq('user_id', userId)
    .eq('organizer_id', organizerId)
    .single();

  if (existing) return existing;

  // Create new if not found
  if (getError?.code !== 'PGRST116') {
    throw getError;
  }

  const { data, error } = await db
    .from('user_merchant_earnings')
    .insert({
      user_id: userId,
      organizer_id: organizerId,
      total_earned: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update user-merchant earnings
 */
export async function updateUserMerchantEarnings(
  earningsId: string,
  newTotal: number
): Promise<UserMerchantEarningRow> {
  const { data, error } = await db
    .from('user_merchant_earnings')
    .update({
      total_earned: newTotal,
      updated_at: new Date().toISOString(),
    })
    .eq('id', earningsId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ===== USER LOOKUP =====

/**
 * Get user by email (for issuing points)
 */
export async function getUserByEmail(email: string) {
  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

// ===== COMPLEX TRANSACTIONS =====

/**
 * Issue points transaction (atomic operation)
 * This handles the full flow:
 * 1. Validate user exists
 * 2. Calculate points
 * 3. Check point bank balance
 * 4. Create ledger entry
 * 5. Update merchant config point banks
 * 6. Update user wallet
 * 7. Update user-merchant earnings
 */
export async function issuePointsTransaction(params: {
  userEmail: string;
  organizerId: string;
  billAmountCents: number;
  issueRate: number;
  pointBankIncluded: number;
  pointBankPurchased: number;
  configId: string;
  businessName: string;
  reference?: string;
}) {
  const {
    userEmail,
    organizerId,
    billAmountCents,
    issueRate,
    pointBankIncluded,
    pointBankPurchased,
    configId,
    businessName,
    reference,
  } = params;

  // 1. Look up user
  const user = await getUserByEmail(userEmail);
  if (!user) {
    throw new Error('User not found');
  }

  // 2. Calculate points
  const billDollars = billAmountCents / 100;
  const pointsToIssue = Math.floor(billDollars * issueRate);

  if (pointsToIssue <= 0) {
    throw new Error('Bill amount too small to issue points');
  }

  // 3. Check point bank balance
  const totalBank = pointBankIncluded + pointBankPurchased;
  if (totalBank < pointsToIssue) {
    throw new Error(`Insufficient point bank. Need ${pointsToIssue} JP, have ${totalBank} JP`);
  }

  // 4. Calculate bucket usage
  let newIncluded = pointBankIncluded;
  let newPurchased = pointBankPurchased;
  let bucketUsed = 'Included';

  if (pointBankIncluded >= pointsToIssue) {
    newIncluded -= pointsToIssue;
  } else {
    const remainingNeeded = pointsToIssue - pointBankIncluded;
    newIncluded = 0;
    newPurchased -= remainingNeeded;
    bucketUsed = 'Mixed';
  }

  // 5. Get or create wallet
  const wallet = await getOrCreateWallet(user.id);

  // 6. Get or create user-merchant earnings
  const earnings = await getOrCreateUserMerchantEarnings(user.id, organizerId);

  // 7. Create ledger entry
  const ledgerEntry = await createLedgerEntry({
    userId: user.id,
    organizerId,
    type: 'mint',
    points: pointsToIssue,
    centsValue: billAmountCents,
    bucketUsed,
    reference: reference || `Bill $${billDollars.toFixed(2)}`,
    metadata: {
      userEmail,
      billAmountCents,
      issueRate,
      issuedBy: businessName,
    },
  });

  // 8. Update merchant config point banks
  await updateMerchantConfig(configId, {
    point_bank_included: newIncluded,
    point_bank_purchased: newPurchased,
  });

  // 9. Update wallet balance
  await updateWalletBalance(wallet.id, wallet.total_points + pointsToIssue);

  // 10. Update user-merchant earnings
  await updateUserMerchantEarnings(earnings.id, earnings.total_earned + pointsToIssue);

  return {
    ledgerEntry,
    pointsIssued: pointsToIssue,
    newIncluded,
    newPurchased,
    billDollars,
    bucketUsed,
  };
}
