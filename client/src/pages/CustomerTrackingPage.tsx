import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  ChefHat,
  UtensilsCrossed,
  Receipt,
  Star,
  Copy,
  ExternalLink,
  Bell,
  Check,
  AlertCircle,
} from 'lucide-react';
import { api } from '../utils/api';
import { Order, OrderStatus } from '../types';
import { joinOrderRoom, getSocket } from '../utils/socket';
import { useToast } from '../context/ToastContext';
import { playOrderNotificationSound } from '../utils/sound';

interface CustomerTrackingPageProps {
  orderId: string;
  onBackToMenu?: () => void;
}

const STEPS: { status: OrderStatus; label: string; desc: string }[] = [
  { status: 'NEW', label: 'Order Received', desc: 'Your order has been received.' },
  { status: 'PREPARING', label: 'Preparing', desc: 'Your order is being prepared in the kitchen.' },
  { status: 'READY', label: 'Ready for Service', desc: 'Your order is ready.' },
  { status: 'SERVED', label: 'Served', desc: 'Dishes served to your table. Bon appétit!' },
  { status: 'COMPLETED', label: 'Completed', desc: 'Thank you for dining with us!' },
];

export const CustomerTrackingPage: React.FC<CustomerTrackingPageProps> = ({ orderId, onBackToMenu }) => {
  const { showToast } = useToast();

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedReview, setCopiedReview] = useState<boolean>(false);

  // Review Feedback Form
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [submittedFeedback, setSubmittedFeedback] = useState<boolean>(false);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const data = await api.get<any>(`/orders/public/track/${orderId}`);
      setOrder(data);
      if (data.reviews && data.reviews.length > 0) {
        setSubmittedFeedback(true);
      }
    } catch (err: any) {
      showToast('Failed to load order tracking details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
    joinOrderRoom(orderId);

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const socket = getSocket();
    const handleStatusUpdate = (payload: { orderId: string; status: OrderStatus }) => {
      if (payload.orderId === orderId) {
        setOrder((prev: any) => (prev ? { ...prev, status: payload.status } : prev));
        playOrderNotificationSound();

        // Trigger browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          const stepInfo = STEPS.find((s) => s.status === payload.status);
          new Notification('PlatePulse Dining Update', {
            body: stepInfo ? stepInfo.desc : `Order status: ${payload.status}`,
          });
        }

        showToast(`Order Status Updated: ${payload.status}`, 'info');
      }
    };

    socket.on('order:status_updated', handleStatusUpdate);

    return () => {
      socket.off('order:status_updated', handleStatusUpdate);
    };
  }, [orderId]);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/reviews/public/submit', {
        orderId,
        rating,
        comment: comment.trim() || undefined,
        customerName: order?.customer?.name,
        customerPhone: order?.customer?.phone,
      });
      setSubmittedFeedback(true);
      showToast('Thank you for your rating!', 'success');
    } catch (err: any) {
      showToast('Failed to record feedback.', 'error');
    }
  };

  const getSuggestedReviewMessage = () => {
    if (!order) return '';
    const topItem = order.orderItems?.[0]?.name || 'the food';
    return `Had a fantastic dining experience at ${order.restaurant?.name || 'this restaurant'}! The ${topItem} was delicious, service was fast, and the QR ordering was so smooth. Highly recommended!`;
  };

  const copyReviewMessage = () => {
    const text = getSuggestedReviewMessage();
    navigator.clipboard.writeText(text);
    setCopiedReview(true);
    showToast('Suggested review message copied to clipboard!', 'success');
    setTimeout(() => setCopiedReview(false), 3000);
  };

  const currentStepIndex = order ? STEPS.findIndex((s) => s.status === order.status) : 0;
  const currency = order?.restaurant?.currency || '₹';

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <Clock size={32} style={{ animation: 'spin 2s linear infinite', margin: '0 auto 1rem' }} />
          <div>Connecting to live order status...</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '1.5rem' }}>
        <div className="card" style={{ maxWidth: '400px', textAlign: 'center', padding: '2rem' }}>
          <AlertCircle size={40} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Order Not Found</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Could not locate tracking information for this order.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '1rem' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Header */}
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {order.restaurant?.name}
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0' }}>
            Order #{order.orderNumber}
          </h1>
          <div style={{ display: 'inline-block', backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 700, padding: '2px 10px', borderRadius: '4px', fontSize: '0.8125rem' }}>
            Table {order.table?.tableNumber}
          </div>
        </div>

        {/* Real-time Order Progress Tracker */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.25rem' }}>
            Live Preparation Status
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
            {STEPS.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const isFuture = idx > currentStepIndex;

              return (
                <div key={step.status} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  {/* Indicator Icon */}
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: isPast || isCurrent ? '#0284c7' : '#e2e8f0',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      flexShrink: 0,
                      boxShadow: isCurrent ? '0 0 0 4px rgba(2, 132, 199, 0.2)' : 'none',
                    }}
                  >
                    {isPast ? <Check size={16} /> : idx + 1}
                  </div>

                  {/* Step Description */}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: isCurrent ? 800 : isPast ? 600 : 500,
                        color: isCurrent ? '#0284c7' : isPast ? '#0f172a' : '#94a3b8',
                      }}
                    >
                      {step.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: isCurrent ? '#475569' : '#94a3b8', marginTop: '2px' }}>
                      {step.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Items Summary */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem' }}>Items Ordered</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {order.orderItems?.map((it: any) => (
              <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{it.quantity}x</span> {it.name}
                  {it.specialInstructions && (
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#b45309' }}>
                      ↳ {it.specialInstructions}
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: 600 }}>{currency}{it.total.toFixed(2)}</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '0.75rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.9375rem' }}>
            <span>Total Bill Amount:</span>
            <span>{currency}{order.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Google Review & Rating Section */}
        <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', textAlign: 'center' }}>
            How was your experience?
          </h3>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', textAlign: 'center', marginBottom: '1rem' }}>
            Your genuine feedback helps us continuously elevate our food and service.
          </p>

          {!submittedFeedback ? (
            <form onSubmit={handleSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Star Rating Buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      color: star <= rating ? '#f59e0b' : '#cbd5e1',
                    }}
                  >
                    <Star size={32} fill={star <= rating ? '#f59e0b' : 'none'} />
                  </button>
                ))}
              </div>

              <div>
                <textarea
                  rows={2}
                  placeholder="Share any comments about your dishes or dining service..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', fontWeight: 600 }}>
                Submit Feedback
              </button>
            </form>
          ) : (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#047857', fontWeight: 700 }}>
                <CheckCircle2 size={18} />
                <span>Thank you for your feedback!</span>
              </div>

              {rating >= 4 && (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '1rem',
                    textAlign: 'left',
                    marginTop: '0.5rem',
                  }}
                >
                  <p style={{ fontSize: '0.8125rem', color: '#0f172a', fontWeight: 600, marginBottom: '0.5rem' }}>
                    We would love to hear from you on Google!
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
                    You can copy our suggested review message or write your own on Google:
                  </p>

                  <div
                    style={{
                      backgroundColor: 'white',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '6px',
                      padding: '0.625rem',
                      fontSize: '0.75rem',
                      color: '#334155',
                      marginBottom: '0.75rem',
                      fontStyle: 'italic',
                    }}
                  >
                    "{getSuggestedReviewMessage()}"
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={copyReviewMessage}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                    >
                      {copiedReview ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                      <span>{copiedReview ? 'Copied!' : 'Copy Review Message'}</span>
                    </button>

                    {order.restaurant?.googleReviewUrl && (
                      <a
                        href={order.restaurant.googleReviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                      >
                        <ExternalLink size={14} /> Review us on Google
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {onBackToMenu && (
          <button onClick={onBackToMenu} className="btn btn-secondary" style={{ width: '100%', marginBottom: '1.5rem' }}>
            Back to Digital Menu
          </button>
        )}
      </div>
    </div>
  );
};
