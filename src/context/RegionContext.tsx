import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, collection, getDocs, doc, setDoc } from '../firebase';

export interface PaymentMethodItem {
  id: string; // 'baridimob' | 'ccp' | 'stripe' | 'paypal' | 'bank' etc.
  name: string;
  instructions: string;
  active: boolean;
}

export interface Region {
  id: string; // unique code e.g., 'DZ', 'US', 'EU', 'GLOBAL'
  name: string;
  currency: string;
  symbol: string;
  multiplier: number; // conversion rate against local DA
  isDefault: boolean;
  paymentMethods: PaymentMethodItem[];
}

interface RegionContextType {
  currentRegion: Region;
  regions: Region[];
  selectedRegionId: string;
  setRegionId: (id: string) => void;
  loading: boolean;
  getCoursePrice: (course: any) => { value: number; formatted: string; currency: string; symbol: string };
  getOfferPrice: (offer: any) => { value: number; formatted: string; currency: string; symbol: string };
  getPlanPrice: (plan: any) => { value: string; formatted: string };
  refreshRegions: () => Promise<void>;
}

const DEFAULT_REGIONS: Region[] = [
  {
    id: 'DZ',
    name: 'Algeria (DA)',
    currency: 'DZD',
    symbol: 'DA',
    multiplier: 1.0,
    isDefault: false,
    paymentMethods: [
      {
        id: 'baridimob',
        name: 'BaridiMob Direct',
        active: true,
        instructions: 'Please transfer the exact amount to RIP:\n00799999002345678956\nBeneficiary Name: Amine Rouabhia'
      },
      {
        id: 'ccp',
        name: 'CCP Post Office',
        active: true,
        instructions: 'Please pay at any Post Office using CCP Account:\nNumber: 0012345678\nKey: 90\nName: Amine Rouabhia'
      }
    ]
  },
  {
    id: 'EU',
    name: 'Europe (EUR)',
    currency: 'EUR',
    symbol: '€',
    multiplier: 0.007,
    isDefault: false,
    paymentMethods: [
      {
        id: 'stripe',
        name: 'Credit Card (Stripe)',
        active: true,
        instructions: 'Pay securely using global credit/debit cards instantly via our Stripe gateway.'
      },
      {
        id: 'bank',
        name: 'SEPA Bank Wire',
        active: true,
        instructions: 'Transfer the amount to our European IBAN:\nIBAN: FR76 3000 1234 5678 9012 345\nBIC: AGRIFRPPXXX\nBank: Crédit Agricole, Paris'
      }
    ]
  },
  {
    id: 'US',
    name: 'United States & Global (USD)',
    currency: 'USD',
    symbol: '$',
    multiplier: 0.0075,
    isDefault: true,
    paymentMethods: [
      {
        id: 'stripe',
        name: 'Credit Card (Stripe)',
        active: true,
        instructions: 'Pay securely using global credit/debit cards instantly. (Visa, MasterCard, Amex)'
      },
      {
        id: 'paypal',
        name: 'PayPal',
        active: true,
        instructions: 'Send your total payment directly to paypal@academy.com'
      }
    ]
  }
];

const RegionContext = createContext<RegionContextType | undefined>(undefined);

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [regions, setRegions] = useState<Region[]>(DEFAULT_REGIONS);
  const [selectedRegionId, setSelectedRegionId] = useState<string>('US');
  const [loading, setLoading] = useState(true);

  const fetchRegions = async () => {
    try {
      const colRef = collection(db, 'regions');
      const snap = await getDocs(colRef);
      if (snap.empty) {
        // Seed default regions
        console.log("Empty Firestore regions collection. Seeding defaults...");
        const list: Region[] = [];
        for (const reg of DEFAULT_REGIONS) {
          await setDoc(doc(db, 'regions', reg.id), reg);
          list.push(reg);
        }
        setRegions(list);
      } else {
        const list = snap.docs.map(d => d.data() as Region);
        setRegions(list);
      }
    } catch (err) {
      console.error("Error loading regions from Firestore:", err);
      // Fallback stays in state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegions();
  }, []);

  // Determine user region choice
  useEffect(() => {
    const saved = localStorage.getItem('cutscene_user_region');
    if (saved) {
      setSelectedRegionId(saved);
    } else {
      // Find fallback default
      const def = regions.find(r => r.isDefault) || regions[0];
      if (def) {
        setSelectedRegionId(def.id);
      }
    }
  }, [regions]);

  const setRegionId = (id: string) => {
    setSelectedRegionId(id);
    localStorage.setItem('cutscene_user_region', id);
  };

  const currentRegion = regions.find(r => r.id === selectedRegionId) || regions.find(r => r.isDefault) || regions[0] || DEFAULT_REGIONS[2];

  // Helper function to format prices cleanly
  const formatValue = (val: number, symbol: string) => {
    const formattedNum = val.toLocaleString(undefined, {
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    });
    return `${formattedNum} ${symbol}`;
  };

  // 1. Convert course pricing
  const getCoursePrice = (course: any) => {
    if (!course) return { value: 0, formatted: '0 DA', currency: 'DZD', symbol: 'DA' };
    
    // Check if courses have explicitly overridden regional pricing maps
    if (course.regionalPrices && course.regionalPrices[selectedRegionId] !== undefined) {
      const val = Number(course.regionalPrices[selectedRegionId]);
      return {
        value: val,
        formatted: formatValue(val, currentRegion.symbol),
        currency: currentRegion.currency,
        symbol: currentRegion.symbol
      };
    }

    // Default conversion using the multiplier
    const basePrice = course.price !== undefined ? Number(course.price) : 15000;
    const converted = basePrice * currentRegion.multiplier;
    return {
      value: converted,
      formatted: formatValue(converted, currentRegion.symbol),
      currency: currentRegion.currency,
      symbol: currentRegion.symbol
    };
  };

  // 2. Convert special offer bundle pricing
  const getOfferPrice = (offer: any) => {
    if (!offer) return { value: 0, formatted: '0 DA', currency: 'DZD', symbol: 'DA' };

    if (offer.regionalPrices && offer.regionalPrices[selectedRegionId] !== undefined) {
      const val = Number(offer.regionalPrices[selectedRegionId]);
      return {
        value: val,
        formatted: formatValue(val, currentRegion.symbol),
        currency: currentRegion.currency,
        symbol: currentRegion.symbol
      };
    }

    const basePrice = offer.price !== undefined ? Number(offer.price) : 0;
    const converted = basePrice * currentRegion.multiplier;
    return {
      value: converted,
      formatted: formatValue(converted, currentRegion.symbol),
      currency: currentRegion.currency,
      symbol: currentRegion.symbol
    };
  };

  // 3. Convert subscription membership plans
  const getPlanPrice = (plan: any) => {
    if (!plan) return { value: '0 DA', formatted: '0 DA' };

    // Regional override in plans
    if (plan.regionalPrices && plan.regionalPrices[selectedRegionId] !== undefined) {
      const val = plan.regionalPrices[selectedRegionId];
      return {
        value: String(val),
        formatted: typeof val === 'number' ? formatValue(val, currentRegion.symbol) : String(val)
      };
    }

    // Free plan always Free
    const nameLower = (plan.name || '').toLowerCase();
    const priceStr = String(plan.price || '0');
    if (priceStr.startsWith('0') || nameLower.includes('free') || priceStr.toLowerCase().includes('free')) {
      return { value: 'Free', formatted: 'Free' };
    }

    // Attempt to convert string prices like "9,900 DA" using the multiplier
    const numericPart = priceStr.replace(/[^\d]/g, '');
    if (numericPart) {
      const valueNum = Number(numericPart);
      const converted = valueNum * currentRegion.multiplier;
      const formatted = formatValue(converted, currentRegion.symbol);
      return {
        value: formatted,
        formatted: formatted
      };
    }

    return { value: priceStr, formatted: priceStr };
  };

  return (
    <RegionContext.Provider
      value={{
        currentRegion,
        regions,
        selectedRegionId,
        setRegionId,
        loading,
        getCoursePrice,
        getOfferPrice,
        getPlanPrice,
        refreshRegions: fetchRegions
      }}
    >
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  const context = useContext(RegionContext);
  if (!context) {
    throw new Error('useRegion must be used within a RegionProvider');
  }
  return context;
}
