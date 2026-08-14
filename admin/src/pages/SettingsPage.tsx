import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiPut, apiPost } from '../lib/api';
import {
  Mail, Server, Lock, Eye, EyeOff, Send, CheckCircle2, AlertCircle,
  Save, Settings, RefreshCw, Shield, Globe, CreditCard
} from 'lucide-react';

interface EmailConfig {
  smtp_host: string;
  smtp_port: string;
  smtp_secure: string;
  smtp_user: string;
  smtp_pass: string;
  email_from: string;
}

interface PaymentConfig {
  razorpay_key_id: string;
  razorpay_key_secret: string;
  razorpay_webhook_secret: string;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'email' | 'payment' | 'general'>('email');
  const [showPass, setShowPass] = useState(false);
  const [showPaymentPass, setShowPaymentPass] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [emailForm, setEmailForm] = useState<EmailConfig>({
    smtp_host: '',
    smtp_port: '587',
    smtp_secure: 'false',
    smtp_user: '',
    smtp_pass: '',
    email_from: 'Open E Academy <noreply@openacademy.in>',
  });

  const [paymentForm, setPaymentForm] = useState<PaymentConfig>({
    razorpay_key_id: '',
    razorpay_key_secret: '',
    razorpay_webhook_secret: '',
  });

  // Load current email settings
  const { isLoading } = useQuery({
    queryKey: ['admin-email-settings'],
    queryFn: () => apiGet<EmailConfig>('/admin/settings/email'),
    onSuccess: (data: any) => {
      if (data?.data) setEmailForm(data.data);
    },
  } as any);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (config: EmailConfig) => apiPut('/admin/settings/email', config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-email-settings'] });
      toast.success('Email settings saved!');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to save settings'),
  });

  // Load current payment settings
  const { isLoading: isLoadingPayment } = useQuery({
    queryKey: ['admin-payment-settings'],
    queryFn: () => apiGet<PaymentConfig>('/admin/settings/payment'),
    onSuccess: (data: any) => {
      if (data?.data) setPaymentForm(data.data);
    },
  } as any);

  // Save payment mutation
  const savePaymentMutation = useMutation({
    mutationFn: (config: PaymentConfig) => apiPut('/admin/settings/payment', config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-settings'] });
      toast.success('Payment settings saved!');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to save payment settings'),
  });

  const handleTestEmail = async () => {
    if (!testEmail) { toast.error('Enter a test email address'); return; }
    setTestLoading(true);
    setTestResult(null);
    try {
      await apiPost('/admin/settings/email/test', { testTo: testEmail });
      setTestResult({ success: true, message: `Test email sent to ${testEmail}` });
      toast.success(`Test email sent to ${testEmail}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Email delivery failed';
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setTestLoading(false);
    }
  };

  const tabs = [
    { id: 'email', label: 'Email / SMTP', icon: Mail },
    { id: 'payment', label: 'Payment Gateway', icon: CreditCard },
    { id: 'general', label: 'General', icon: Settings },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">System Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure platform-wide settings</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold transition-all border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600 bg-primary-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Email / SMTP Settings */}
      {activeTab === 'email' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Config Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Server className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">SMTP Configuration</h2>
                <p className="text-xs text-gray-400">Configure outgoing email server for OTPs, notifications, and more</p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 text-gray-300 animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">SMTP Host *</label>
                    <input
                      value={emailForm.smtp_host}
                      onChange={e => setEmailForm(p => ({ ...p, smtp_host: e.target.value }))}
                      placeholder="smtp.gmail.com"
                      className="input"
                    />
                    <p className="text-xs text-gray-400 mt-1">e.g. smtp.gmail.com, mail.yourdomain.com</p>
                  </div>
                  <div>
                    <label className="label">Port</label>
                    <input
                      type="number"
                      value={emailForm.smtp_port}
                      onChange={e => setEmailForm(p => ({ ...p, smtp_port: e.target.value }))}
                      placeholder="587"
                      className="input"
                    />
                    <p className="text-xs text-gray-400 mt-1">587 (TLS) or 465 (SSL) or 25</p>
                  </div>
                </div>

                <div>
                  <label className="label">Encryption</label>
                  <div className="flex gap-3">
                    {[{ val: 'false', label: 'TLS/STARTTLS (Port 587)' }, { val: 'true', label: 'SSL (Port 465)' }].map(opt => (
                      <label key={opt.val} className={`flex-1 flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${emailForm.smtp_secure === opt.val ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input
                          type="radio"
                          name="smtp_secure"
                          value={opt.val}
                          checked={emailForm.smtp_secure === opt.val}
                          onChange={() => setEmailForm(p => ({ ...p, smtp_secure: opt.val }))}
                          className="text-primary-600"
                        />
                        <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">SMTP Username / Email *</label>
                    <input
                      value={emailForm.smtp_user}
                      onChange={e => setEmailForm(p => ({ ...p, smtp_user: e.target.value }))}
                      placeholder="your@gmail.com"
                      className="input"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label className="label">SMTP Password / App Password</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={emailForm.smtp_pass}
                        onChange={e => setEmailForm(p => ({ ...p, smtp_pass: e.target.value }))}
                        placeholder="App password or SMTP password"
                        className="input pr-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">For Gmail, use an <a href="https://myaccount.google.com/apppasswords" target="_blank" className="text-primary-600 underline">App Password</a></p>
                  </div>
                </div>

                <div>
                  <label className="label">From Name & Email</label>
                  <input
                    value={emailForm.email_from}
                    onChange={e => setEmailForm(p => ({ ...p, email_from: e.target.value }))}
                    placeholder='Open E Academy <noreply@openacademy.in>'
                    className="input"
                  />
                  <p className="text-xs text-gray-400 mt-1">Format: Name {'<email@domain.com>'}</p>
                </div>

                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <button
                    onClick={() => saveMutation.mutate(emailForm)}
                    disabled={saveMutation.isPending}
                    className="btn-primary"
                  >
                    <Save className="w-4 h-4" />
                    {saveMutation.isPending ? 'Saving...' : 'Save Email Settings'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Test Email Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-primary-600" />
                <h3 className="font-bold text-gray-900 text-sm">Test Email Delivery</h3>
              </div>
              <p className="text-xs text-gray-500">Send a test email to verify your SMTP configuration is working correctly.</p>
              <div>
                <label className="label">Send test to</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={e => { setTestEmail(e.target.value); setTestResult(null); }}
                  placeholder="test@example.com"
                  className="input"
                />
              </div>
              <button
                onClick={handleTestEmail}
                disabled={testLoading || !testEmail}
                className="btn-secondary w-full justify-center"
              >
                {testLoading
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending...</>
                  : <><Send className="w-4 h-4" /> Send Test Email</>
                }
              </button>

              {testResult && (
                <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${testResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                  {testResult.success
                    ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                    : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  }
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <h4 className="font-bold text-amber-800 text-xs flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Configuration Tips
              </h4>
              <ul className="text-xs text-amber-700 space-y-1.5 list-disc list-inside">
                <li>Gmail: Enable 2FA and use an App Password</li>
                <li>Zoho/Outlook: Use smtp.zoho.com / smtp.office365.com</li>
                <li>Port 587 with TLS is recommended for most providers</li>
                <li>Settings saved here override .env values</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Payment Gateway Settings */}
      {activeTab === 'payment' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Razorpay Configuration</h2>
                <p className="text-xs text-gray-400">Configure keys to accept payments via Razorpay</p>
              </div>
            </div>

            {isLoadingPayment ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 text-gray-300 animate-spin" />
              </div>
            ) : (
              <>
                <div>
                  <label className="label">Key ID *</label>
                  <input
                    value={paymentForm.razorpay_key_id}
                    onChange={e => setPaymentForm(p => ({ ...p, razorpay_key_id: e.target.value }))}
                    placeholder="rzp_live_..."
                    className="input"
                    autoComplete="off"
                  />
                </div>
                
                <div>
                  <label className="label">Key Secret *</label>
                  <div className="relative">
                    <input
                      type={showPaymentPass ? 'text' : 'password'}
                      value={paymentForm.razorpay_key_secret}
                      onChange={e => setPaymentForm(p => ({ ...p, razorpay_key_secret: e.target.value }))}
                      placeholder="Razorpay Key Secret"
                      className="input pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPaymentPass(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPaymentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">Webhook Secret (Optional)</label>
                  <div className="relative">
                    <input
                      type={showPaymentPass ? 'text' : 'password'}
                      value={paymentForm.razorpay_webhook_secret}
                      onChange={e => setPaymentForm(p => ({ ...p, razorpay_webhook_secret: e.target.value }))}
                      placeholder="Razorpay Webhook Secret"
                      className="input pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPaymentPass(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPaymentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Required if you want to verify Razorpay webhook signatures securely</p>
                </div>

                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <button
                    onClick={() => savePaymentMutation.mutate(paymentForm)}
                    disabled={savePaymentMutation.isPending}
                    className="btn-primary"
                  >
                    <Save className="w-4 h-4" />
                    {savePaymentMutation.isPending ? 'Saving...' : 'Save Payment Settings'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Payment Gateway Tips */}
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <h4 className="font-bold text-amber-800 text-xs flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Configuration Tips
              </h4>
              <ul className="text-xs text-amber-700 space-y-1.5 list-disc list-inside">
                <li>Keys are available in the Razorpay Dashboard under Settings {'->'} API Keys.</li>
                <li>Make sure to use test keys for development and live keys for production.</li>
                <li>Webhook secrets should match the one you configure in Razorpay Webhooks.</li>
                <li>Settings saved here override .env values.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* General Settings Placeholder */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <Globe className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="font-bold text-gray-700 mb-1">General Settings</h3>
          <p className="text-sm text-gray-400">Site name, logo, timezone and other general settings coming soon.</p>
        </div>
      )}
    </div>
  );
}
