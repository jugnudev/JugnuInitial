import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
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
 * GET /api/loyalty/participating-businesses
 * Get list of businesses that accept loyalty point redemptions
 */
router.get('/participating-businesses', async (req: Request, res: Response) => {
  try {
    // Get all organizers with active loyalty configs
    const { data: configs, error } = await db
      .from('merchant_loyalty_config')
      .select(`
        organizer_id,
        redeem_cap_percentage,
        organizers:organizer_id (
          id,
          business_name,
          status
        )
      `)
      .eq('subscription_status', 'beta-free');

    if (error) throw error;

    // Filter for active organizers and format response
    const businesses = (configs || [])
      .filter((c: any) => c.organizers?.status === 'active')
      .map((c: any) => ({
        id: c.organizer_id,
        name: c.organizers?.business_name || 'Unknown Business',
        redeemCapPercentage: c.redeem_cap_percentage,
      }));

    res.json({
      ok: true,
      businesses,
    });
  } catch (error) {
    console.error('[Loyalty] Get participating businesses error:', error);
    res.status(500).json({ ok: false, error: 'Failed to get businesses' });
  }
});

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
      data: {
        wallet: {
          id: wallet.id,
          user_id: wallet.user_id,
          total_points: wallet.total_points,
          created_at: wallet.created_at,
          updated_at: wallet.updated_at,
        },
        merchantEarnings: earnings.map((e: any) => ({
          id: e.id,
          merchant_id: e.organizer_id,
          total_earned: e.total_earned,
          business_name: e.business_name || null,
        })),
      },
    });
  } catch (error) {
    console.error('[Loyalty] Get wallet error:', error);
    res.status(500).json({ ok: false, error: 'Failed to get wallet' });
  }
});

/**
 * GET /api/loyalty/wallet/qr
 * Generate a signed JWT for QR code scanning at merchant checkouts
 */
router.get('/wallet/qr', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const wallet = await loyaltyStorage.getOrCreateWallet(user.id);

    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    
    if (!jwtSecret) {
      console.error('[Loyalty] JWT_SECRET or SESSION_SECRET not configured');
      return res.status(500).json({ 
        ok: false, 
        error: 'Server misconfiguration: JWT secret not set' 
      });
    }
    
    const token = jwt.sign(
      {
        walletId: wallet.id,
        userId: wallet.user_id,
        type: 'jugnu_wallet',
        iat: Math.floor(Date.now() / 1000),
      },
      jwtSecret,
      { expiresIn: '365d' } // Long-lived for wallet QR codes
    );

    res.json({
      ok: true,
      token,
    });
  } catch (error) {
    console.error('[Loyalty] Generate QR token error:', error);
    res.status(500).json({ ok: false, error: 'Failed to generate QR token' });
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

/**
 * POST /api/loyalty/redeem
 * Redeem (burn) points at a merchant for a discount
 * 
 * Flow:
 * 1. Validate user wallet has sufficient balance
 * 2. Calculate max redeemable based on bill and cap
 * 3. Create burn ledger entry
 * 4. Update user wallet
 */
const redeemPointsSchema = z.object({
  businessId: z.string().uuid('Valid business ID required'),
  billAmountCents: z.number().int().positive('Bill amount must be positive'),
  pointsToRedeem: z.number().int().positive('Points to redeem must be positive'),
  reference: z.string().optional(),
});

router.post('/redeem', requireAuth, async (req: Request, res: Response) => {
  try {
    const validation = redeemPointsSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Invalid redeem data',
        details: validation.error.errors 
      });
    }

    const { businessId, billAmountCents, pointsToRedeem, reference } = validation.data;
    const user = (req as any).user;

    // Get business/organizer info
    const { data: organizer, error: orgError } = await db
      .from('organizers')
      .select('*')
      .eq('id', businessId)
      .single();

    if (orgError || !organizer) {
      return res.status(404).json({ 
        ok: false, 
        error: 'Business not found' 
      });
    }

    // Get merchant loyalty config for redeem cap
    const config = await loyaltyStorage.getMerchantConfig(organizer.id);
    
    if (!config) {
      return res.status(403).json({ 
        ok: false, 
        error: 'This business does not accept loyalty point redemptions' 
      });
    }

    // Execute the redeem transaction
    const result = await loyaltyStorage.redeemPointsTransaction({
      userId: user.id,
      organizerId: organizer.id,
      billAmountCents,
      pointsToRedeem,
      redeemCapPercentage: config.redeem_cap_percentage,
      businessName: organizer.business_name,
      reference,
    });

    res.json({
      ok: true,
      transaction: {
        pointsRedeemed: result.pointsRedeemed,
        cadValue: result.cadValue,
        billAmountCents,
        billDollars: result.billDollars.toFixed(2),
        newWalletBalance: result.newWalletBalance,
        maxRedeemablePoints: result.maxRedeemablePoints,
        businessName: organizer.business_name,
      },
    });
  } catch (error: any) {
    console.error('[Loyalty] Redeem points error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to redeem points' });
  }
});

export default router;
