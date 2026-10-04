/**
 * TRAVELIA CURRENCY REST API ROUTES
 * 
 * Endpoints:
 * - GET /api/currency/rates?base=INR
 * - GET /api/currency/convert?amount=1000&from=INR&to=USD
 */

import { Router, Request, Response } from 'express';
import { currencyService } from '../services/currencyService';
import { isValidCurrency } from '../middleware/validation';

export const currencyRouter = Router();

currencyRouter.get('/rates', async (req: Request, res: Response) => {
  try {
    const base = ((req.query.base as string) || 'INR').toUpperCase();
    if (!isValidCurrency(base)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CURRENCY', message: `Unsupported currency code "${base}".` }
      });
    }

    const result = await currencyService.getRates(base);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'CURRENCY_RATES_ERROR', message: err.message || 'Failed to fetch currency rates' }
    });
  }
});

currencyRouter.get('/convert', async (req: Request, res: Response) => {
  try {
    const amountStr = req.query.amount as string;
    const from = ((req.query.from as string) || 'INR').toUpperCase();
    const to = ((req.query.to as string) || 'USD').toUpperCase();

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount < 0 || !isFinite(amount)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Valid positive finite amount query parameter is required' }
      });
    }

    if (!isValidCurrency(from)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CURRENCY', message: `Unsupported source currency code "${from}".` }
      });
    }

    if (!isValidCurrency(to)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CURRENCY', message: `Unsupported target currency code "${to}".` }
      });
    }

    const result = await currencyService.convert(amount, from, to);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'CURRENCY_CONVERT_ERROR', message: err.message || 'Failed to convert currency' }
    });
  }
});


export default currencyRouter;
