/**
 * TRAVELIA API INPUT VALIDATION SUITE — PHASE 9
 * 
 * CORE PRINCIPLE:
 * Strict validation of:
 * - Required fields
 * - Types & Ranges
 * - IDs & Safe strings
 * - Dates (ISO 8601 YYYY-MM-DD)
 * - Coordinates (Lat -90 to +90, Lng -180 to +180)
 * - Currency codes
 * - Trip ownership where authentication context exists
 */

import { Request, Response, NextFunction } from 'express';
import { tripRepository } from '../repositories/tripRepository';

/**
 * Validates safe string identifier
 */
export function isValidId(id: any): boolean {
  return typeof id === 'string' && 
         id.trim().length > 0 && 
         id.length <= 128 && 
         !/[<>'"`\\]/.test(id);
}

/**
 * Validates geographic coordinates
 */
export function isValidCoordinate(latitude: any, longitude: any): { valid: boolean; error?: string } {
  const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
  const lng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;

  if (typeof lat !== 'number' || isNaN(lat) || !isFinite(lat)) {
    return { valid: false, error: `Invalid latitude "${latitude}". Must be a finite number between -90 and +90.` };
  }
  if (typeof lng !== 'number' || isNaN(lng) || !isFinite(lng)) {
    return { valid: false, error: `Invalid longitude "${longitude}". Must be a finite number between -180 and +180.` };
  }

  if (lat < -90 || lat > 90) {
    return { valid: false, error: `Latitude ${lat} is out of bounds. Must be between -90 and +90 degrees.` };
  }
  if (lng < -180 || lng > 180) {
    return { valid: false, error: `Longitude ${lng} is out of bounds. Must be between -180 and +180 degrees.` };
  }

  return { valid: true };
}

/**
 * Validates date string in strict YYYY-MM-DD format
 */
export function isValidDateString(dateStr: any): boolean {
  if (typeof dateStr !== 'string') return false;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12) return false;

  const daysInMonth = new Date(year, month, 0).getDate();
  return day >= 1 && day <= daysInMonth;
}

/**
 * Validates currency code against known currencies
 */
export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AED', 'AUD', 'CAD', 'SGD', 'THB'] as const;

export function isValidCurrency(code: any): boolean {
  return typeof code === 'string' && SUPPORTED_CURRENCIES.includes(code.toUpperCase() as any);
}

/**
 * Validates number within inclusive bounds
 */
export function validateNumberRange(val: any, min: number, max: number, fieldName: string): { valid: boolean; error?: string } {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) {
    return { valid: false, error: `${fieldName} must be a valid number.` };
  }
  if (num < min || num > max) {
    return { valid: false, error: `${fieldName} (${num}) is out of range. Must be between ${min} and ${max}.` };
  }
  return { valid: true };
}

/**
 * Validates that all required fields exist in object and are not empty
 */
export function validateRequiredFields(obj: any, requiredFields: string[]): { valid: boolean; missingFields: string[] } {
  if (!obj || typeof obj !== 'object') {
    return { valid: false, missingFields: requiredFields };
  }

  const missing: string[] = [];
  for (const field of requiredFields) {
    const val = obj[field];
    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
      missing.push(field);
    }
  }

  return {
    valid: missing.length === 0,
    missingFields: missing
  };
}

/**
 * Validates trip ownership if authentication header or trip ownership exists
 */
export function validateTripOwnership(tripId: string, req: Request): { authorized: boolean; reason?: string } {
  if (!isValidId(tripId)) {
    return { authorized: false, reason: 'Invalid trip ID format' };
  }

  const trip = tripRepository.findById(tripId);
  if (!trip) {
    return { authorized: false, reason: 'Trip not found' };
  }

  // Check if trip is explicitly owned by a user
  const tripOwnerId = (trip as any).userId;
  const requestUserId = req.headers['x-travelia-user-id'] as string;

  // If trip has an owner assigned and incoming request provides user ID, they must match
  if (tripOwnerId && requestUserId && tripOwnerId !== requestUserId) {
    return {
      authorized: false,
      reason: 'Forbidden: You do not have permission to modify this trip.'
    };
  }

  return { authorized: true };
}

/**
 * Express middleware helper to enforce required fields on req.body
 */
export function requireBodyFields(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { valid, missingFields } = validateRequiredFields(req.body, fields);
    if (!valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Missing required field(s): ${missingFields.join(', ')}`,
          missingFields
        }
      });
    }
    next();
  };
}
