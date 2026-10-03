'use client';

import { useState } from 'react';
import { useAuth } from './useAuth';

export interface CheckoutParams {
  paymentType: 'subscription' | 'featured_profile' | 'consultation' | 'contact_unlock';
  planId?: string;
  couponCode?: string;
  bookingDetails?: any;
  featuredDays?: number;
  targetProfileId?: string;
  onSuccess?: (data: any) => void;
  onCancel?: () => void;
}

export function useCheckout() {
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadScript = (src: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Razorpay) return resolve(true);

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const initiateCheckout = async (params: CheckoutParams) => {
    setLoading(true);
    setError(null);

    try {
      if (!isAuthenticated) {
        throw new Error('Please login to purchase membership packages.');
      }

      // 1. Request Order Creation on Server
      let billingProfile = {};
      try { billingProfile = JSON.parse(localStorage.getItem(`gokul_billing_profile:${user?.id}`) || '{}'); } catch {}
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentType: params.paymentType,
          planId: params.planId,
          couponCode: params.couponCode,
          bookingDetails: params.bookingDetails,
          featuredDays: params.featuredDays,
          targetProfileId: params.targetProfileId,
          billingProfile,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to initialize payment transaction');
      }

      const orderData = await res.json();

      // Load the official Razorpay Standard Checkout SDK.
      const scriptLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay Checkout SDK. Please check your network connection.');
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Gokul Vivaham',
        description: orderData.description,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          setLoading(true);
          try {
            // Post verification payload to Server
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (!verifyRes.ok) {
              const verifyErr = await verifyRes.json();
              throw new Error(verifyErr.error || 'Payment verification failed');
            }

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              setLoading(false);
              if (params.onSuccess) {
                params.onSuccess(verifyData);
              }
            } else {
              throw new Error('Verification failed. Payment status is invalid.');
            }
          } catch (err: any) {
            setError(err.message || 'Payment verification failed');
            setLoading(false);
          }
        },
        prefill: {
          name: orderData.user.name,
          email: orderData.user.email,
          contact: orderData.user.phone,
        },
        theme: {
          color: '#800020', // Signature Maroon Accent
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            if (params.onCancel) {
              params.onCancel();
            }
          },
        },
      };

      const paymentObject = new (window as any).Razorpay(options);

      paymentObject.on('payment.failed', function (response: any) {
        setError(response.error?.description || 'Payment transaction failed at gateway level');
        setLoading(false);
      });

      paymentObject.open();

    } catch (err: any) {
      setError(err.message || 'An error occurred during checkout setup');
      setLoading(false);
    }
  };

  return {
    initiateCheckout,
    loading,
    error,
    setError,
  };
}
