import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../database';
import { organizers } from '@shared/schema';
import * as loyaltyStorage from './loyalty-storage';

const router = Router();

// ===== MIDDLEWARE =====

/**
 * Require authenticated user (session-based)
 * Used for user-facing loyalty features (wallet, redeem)
 */
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Authentication required' });
  }
  
  next();
};

/**
 * Require approved organizer with active loyalty access
 * Used for business-facing loyalty features (issue points, config)
 * 
 * NOTE: During FREE BETA, we auto-create merchant_loyalty_config if it doesn't exist
 * Post-beta: This will check subscription status
 */
const requireLoyaltyAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    // Get organizer record
    const { data: organizer, error: orgError } = await db
      .from('organizers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (orgError || !organizer || organizer.status !== 'active') {
      return res.status(403).json({ 
        ok: false, 
        error: 'Active business account required for loyalty features' 
      });
    }

    // Get or create merchant loyalty config (FREE BETA - auto-provision)
    let config = await loyaltyStorage.getMerchantConfig(organizer.id);

    if (!config) {
      // Auto-create config during FREE BETA with 20k included points
      config = await loyaltyStorage.createMerchantConfig(organizer.id);
      console.log(`[Loyalty] Auto-created config for organizer ${organizer.id} during beta`);
    }

    // Attach to request
    (req as any).organizer = organizer;
    (req as any).loyaltyConfig = config;
    next();
  } catch (error) {
    console.error('[Loyalty] Access check error:', error);
    res.status(500).json({ ok: false, error: 'Failed to check loyalty access' });
  }
};

// ===== HELPER FUNCTIONS =====
// (All moved to loyalty-storage.ts for better separation of concerns)

// ===== USER ROUTES (Wallet, Redeem) =====

/**
 * GET /api/loyalty/wallet
 * Get authenticated user's wallet balance and per-merchant breakdown
 */
router.get('/wallet', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const wallet = await loyaltyStorage.getOrCreateWallet(user.id);
    const earnings = await loyaltyStorage.getUserMerchantEarnings(user.id);

    res.json({
      ok: true,
      wallet: {
        id: wallet.id,
        totalPoints: wallet.total_points,
        cadValue: (wallet.total_points / 1000).toFixed(2), // 1000 JP = $1 CAD
      },
      merchantBreakdown: earnings.map((e: any) => ({
        organizerId: e.organizer_id,
        businessName: e.business_name || 'Unknown Business',
        totalEarned: e.total_earned,
        cadValue: (e.total_earned / 1000).toFixed(2),
      })),
    });
  } catch (error) {
    console.error('[Loyalty] Get wallet error:', error);
    res.status(500).json({ ok: false, error: 'Failed to get wallet' });
  }
});

/**
 * GET /api/loyalty/transactions
 * Get user's transaction history
 */
router.get('/transactions', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const transactions = await loyaltyStorage.getUserTransactions(user.id, limit, offset);

    res.json({
      ok: true,
      transactions: transactions.map((tx: any) => ({
        id: tx.id,
        createdAt: tx.created_at,
        type: tx.type,
        points: tx.points,
        cadValue: tx.cents_value ? (tx.cents_value / 100).toFixed(2) : null,
        businessName: tx.business_name || 'Unknown',
        reference: tx.reference,
      })),
    });
  } catch (error) {
    console.error('[Loyalty] Get transactions error:', error);
    res.status(500).json({ ok: false, error: 'Failed to get transactions' });
  }
});

// ===== BUSINESS ROUTES (Issue, Config) =====

/**
 * GET /api/loyalty/business/config
 * Get merchant's loyalty configuration and point bank status
 */
router.get('/business/config', requireLoyaltyAccess, async (req: Request, res: Response) => {
  try {
    const config = (req as any).loyaltyConfig;
    const organizer = (req as any).organizer;

    res.json({
      ok: true,
      config: {
        organizerId: config.organizer_id,
        businessName: organizer.business_name,
        issueRatePerDollar: config.issue_rate_per_dollar,
        redeemCapPercentage: config.redeem_cap_percentage,
        pointBankIncluded: config.point_bank_included,
        pointBankPurchased: config.point_bank_purchased,
        totalPointBank: config.point_bank_included + config.point_bank_purchased,
        subscriptionTier: config.subscription_tier,
        subscriptionStatus: config.subscription_status,
        isBetaFree: config.subscription_status === 'beta-free',
      },
    });
  } catch (error) {
    console.error('[Loyalty] Get config error:', error);
    res.status(500).json({ ok: false, error: 'Failed to get config' });
  }
});

/**
 * PATCH /api/loyalty/business/config
 * Update merchant's loyalty configuration (issue rate, redeem cap)
 */
const updateConfigSchema = z.object({
  issueRatePerDollar: z.number().int().min(0).max(150).optional(),
  redeemCapPercentage: z.number().int().min(0).max(50).optional(),
});

router.patch('/business/config', requireLoyaltyAccess, async (req: Request, res: Response) => {
  try {
    const validation = updateConfigSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Invalid config data',
        details: validation.error.errors 
      });
    }

    const config = (req as any).loyaltyConfig;
    const { issueRatePerDollar, redeemCapPercentage } = validation.data;

    const updates: any = {};
    if (issueRatePerDollar !== undefined) updates.issue_rate_per_dollar = issueRatePerDollar;
    if (redeemCapPercentage !== undefined) updates.redeem_cap_percentage = redeemCapPercentage;

    const updated = await loyaltyStorage.updateMerchantConfig(config.id, updates);

    res.json({
      ok: true,
      config: {
        issueRatePerDollar: updated.issue_rate_per_dollar,
        redeemCapPercentage: updated.redeem_cap_percentage,
      },
    });
  } catch (error) {
    console.error('[Loyalty] Update config error:', error);
    res.status(500).json({ ok: false, error: 'Failed to update config' });
  }
});

/**
 * POST /api/loyalty/business/issue
 * Issue (mint) points to a user for a purchase
 * 
 * Flow:
 * 1. Look up user by email
 * 2. Calculate points: billAmountCents / 100 * issueRate
 * 3. Deduct from point bank (Included first, then Purchased)
 * 4. Create ledger entry
 * 5. Update user wallet + merchant earnings
 */
const issuePointsSchema = z.object({
  userEmail: z.string().email('Valid email required'),
  billAmountCents: z.number().int().positive('Bill amount must be positive'),
  reference: z.string().optional(), // Bill ID, receipt number, etc.
});

router.post('/business/issue', requireLoyaltyAccess, async (req: Request, res: Response) => {
  try {
    const validation = issuePointsSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Invalid issue data',
        details: validation.error.errors 
      });
    }

    const { userEmail, billAmountCents, reference } = validation.data;
    const config = (req as any).loyaltyConfig;
    const organizer = (req as any).organizer;

    // Execute the full transaction using storage service
    const result = await loyaltyStorage.issuePointsTransaction({
      userEmail,
      organizerId: organizer.id,
      billAmountCents,
      issueRate: config.issue_rate_per_dollar,
      pointBankIncluded: config.point_bank_included,
      pointBankPurchased: config.point_bank_purchased,
      configId: config.id,
      businessName: organizer.business_name,
      reference,
    });

    res.json({
      ok: true,
      transaction: {
        userEmail,
        pointsIssued: result.pointsIssued,
        billAmountCents,
        cadValue: result.billDollars.toFixed(2),
        bucketUsed: result.bucketUsed,
        remainingBank: {
          included: result.newIncluded,
          purchased: result.newPurchased,
          total: result.newIncluded + result.newPurchased,
        },
      },
    });
  } catch (error: any) {
    console.error('[Loyalty] Issue points error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to issue points' });
  }
});

export default router;
