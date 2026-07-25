import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Send, Upload, FileText, Image, Film,
  AlertTriangle, CheckCircle2, Copy, ExternalLink, Plus, Loader2,
  HelpCircle, Info, ChevronDown, ChevronRight, Paperclip, Trash2
} from 'lucide-react';
import { issueService } from '../../services/issueService';
import { useIssueAuth } from '../../contexts/IssueAuthContext';
import type { FormConfig, Feature, IssueType, Ticket } from '../../types/issues';

type UploadedFile = {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  url?: string;
  storage_key?: string;
  thumbnail_url?: string | null;
  original_name: string;
  mime_type: string;
  file_size: number;
};

const IMPACT_OPTIONS = [
  { value: 'blocking', label: 'Completely blocking my work', icon: AlertTriangle, color: 'text-red-700', ring: 'ring-red-500', border: 'border-red-200', bg: 'bg-red-50' },
  { value: 'major', label: 'Major issue, but there is a workaround', icon: AlertTriangle, color: 'text-orange-700', ring: 'ring-orange-500', border: 'border-orange-200', bg: 'bg-orange-50' },
  { value: 'minor', label: 'Minor issue', icon: Info, color: 'text-yellow-700', ring: 'ring-yellow-500', border: 'border-yellow-200', bg: 'bg-yellow-50' },
  { value: 'suggestion', label: 'Suggestion or improvement', icon: HelpCircle, color: 'text-blue-700', ring: 'ring-blue-500', border: 'border-blue-200', bg: 'bg-blue-50' },
];

let fileIdCounter = 0;

export default function ReportIssuePage() {
  const navigate = useNavigate();
  const { user } = useIssueAuth();
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Ticket | null>(null);
  const [error, setError] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showMerchant, setShowMerchant] = useState(false);
  const [showAdditional, setShowAdditional] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formDraft, setFormDraft] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('issue_form_draft');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    issueService.getFormConfig().then(setConfig).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      setFormDraft((prev: any) => ({
        ...prev,
        reporter_name: prev.reporter_name || user.full_name,
        reporter_email: prev.reporter_email || user.email,
        reporter_team: prev.reporter_team || user.team,
      }));
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('issue_form_draft', JSON.stringify(formDraft));
  }, [formDraft]);

  const updateField = (field: string, value: any) => {
    setFormDraft((prev: any) => ({ ...prev, [field]: value }));
  };

  const uploadingCount = uploadedFiles.filter(f => f.status === 'uploading').length;
  const haveErrors = uploadedFiles.some(f => f.status === 'error');

  const generateTitle = useCallback(() => {
    const area = config?.areas.find(a => a.id === formDraft.product_area_id)?.name;
    const feature = features.find(f => f.id === formDraft.feature_id)?.name;
    const desc = (formDraft.description || '').slice(0, 80);
    const prefix = [area, feature].filter(Boolean).join(' - ');
    return prefix ? `${prefix}: ${desc}` : desc || 'Issue Report';
  }, [config, features, formDraft.product_area_id, formDraft.feature_id, formDraft.description]);

  const isFieldRequired = (field: string) => {
    const requiredFields = ['reporter_name', 'reporter_team', 'reporter_email', 'product_area_id', 'feature_id', 'issue_type_id', 'description', 'impact'];
    return requiredFields.includes(field);
  };

  const isOtherSelected = (field: string) => formDraft[`${field}_other`] === true;
  const otherTextField = (field: string) => formDraft[`${field}_other_text`] || '';

  const handleAreaChange = async (areaId: string) => {
    const isOther = areaId === 'other';
    updateField('product_area_id', isOther ? '' : areaId);
    updateField('product_area_other', isOther ? true : false);
    if (!isOther) updateField('product_area_other_text', '');
    updateField('feature_id', '');
    updateField('feature_other', false);
    updateField('feature_other_text', '');
    updateField('issue_type_id', '');
    updateField('issue_type_other', false);
    updateField('issue_type_other_text', '');
    setFeatures([]);
    setIssueTypes([]);
    if (areaId && !isOther) {
      try {
        const feats = await issueService.getFeatures(areaId);
        setFeatures(feats);
      } catch {}
    } else if (isOther) {
      setFeatures(config?.features?.filter(f => f.active) || []);
    }
  };

  const handleFeatureChange = async (featureId: string) => {
    const isOther = featureId === 'other';
    updateField('feature_id', isOther ? '' : featureId);
    updateField('feature_other', isOther ? true : false);
    if (!isOther) updateField('feature_other_text', '');
    updateField('issue_type_id', '');
    updateField('issue_type_other', false);
    updateField('issue_type_other_text', '');
    setIssueTypes([]);
    if (featureId && !isOther) {
      try {
        const types = await issueService.getIssueTypes(featureId);
        setIssueTypes(types);
      } catch {}
    } else if (isOther) {
      setIssueTypes(config?.issueTypes?.filter(t => t.active) || []);
    }
  };

  const getAreaOptions = () => {
    const areas = config?.areas?.filter(a => a.active) || [];
    return [...areas, { id: 'other', name: 'Other' }];
  };

  const getFeatureOptions = () => {
    const feats = isOtherSelected('product_area') ? (config?.features || []).filter(f => f.active) : features.filter(f => f.active);
    return [...feats, { id: 'other', name: 'Other' }];
  };

  const getIssueTypeOptions = () => {
    const types = isOtherSelected('feature') ? (config?.issueTypes || []).filter(t => t.active) : issueTypes.filter(t => t.active);
    return [...types, { id: 'other', name: 'Other' }];
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files ?? []) as File[];
    addFiles(files);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) addFiles(files);
  }, []);

  const addFiles = (files: File[]) => {
    const newFiles: UploadedFile[] = files.map(f => ({
      id: `file_${++fileIdCounter}`,
      file: f,
      progress: 0,
      status: 'uploading',
      original_name: f.name,
      mime_type: f.type,
      file_size: f.size,
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
    newFiles.forEach(f => uploadFile(f));
  };

  const uploadFile = async (fileItem: UploadedFile) => {
    try {
      const result = await issueService.uploadFile(fileItem.file);
      setUploadedFiles(prev => prev.map(f =>
        f.id === fileItem.id ? {
          ...f, status: 'done', progress: 100,
          url: result.url, storage_key: result.storage_key,
          thumbnail_url: result.thumbnail_url,
          original_name: result.original_name,
          mime_type: result.mime_type,
          file_size: result.file_size,
        } : f
      ));
    } catch {
      setUploadedFiles(prev => prev.map(f =>
        f.id === fileItem.id ? { ...f, status: 'error', progress: 0 } : f
      ));
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const retryUpload = (id: string) => {
    const file = uploadedFiles.find(f => f.id === id);
    if (file) {
      setUploadedFiles(prev => prev.map(f =>
        f.id === id ? { ...f, status: 'uploading', progress: 0 } : f
      ));
      uploadFile({ ...file, status: 'uploading', progress: 0 });
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    const autoCapture = {
      platform: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile App' : 'Web Dashboard',
      browser: navigator.userAgent,
      device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : /Tablet|iPad/i.test(navigator.userAgent) ? 'Tablet' : 'Desktop',
      operating_system: (() => {
        const ua = navigator.userAgent;
        if (ua.includes('Windows')) return 'Windows';
        if (ua.includes('Mac OS') || ua.includes('macOS')) return 'macOS';
        if (ua.includes('Linux') && !ua.includes('Android')) return 'Linux';
        if (ua.includes('Android')) return 'Android';
        if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iOS')) return 'iOS';
        return 'Unknown';
      })(),
      issue_url: window.location.href,
      first_noticed_at: new Date().toISOString(),
    };

    let description = formDraft.description || '';
    const extras: string[] = [];
    if (isOtherSelected('product_area') && otherTextField('product_area')) {
      extras.push(`Product Area (other): ${otherTextField('product_area')}`);
    }
    if (isOtherSelected('feature') && otherTextField('feature')) {
      extras.push(`Feature (other): ${otherTextField('feature')}`);
    }
    if (isOtherSelected('issue_type') && otherTextField('issue_type')) {
      extras.push(`Issue Type (other): ${otherTextField('issue_type')}`);
    }
    if (extras.length > 0) {
      description = `${description}\n\n---\n${extras.join('\n')}`;
    }

    const impact = formDraft.impact;
    let system_unusable = false;
    let workaround_available: number | null = null;
    if (impact === 'blocking') { system_unusable = true; workaround_available = 0; }
    else if (impact === 'major') { system_unusable = false; workaround_available = 1; }
    else if (impact === 'minor') { system_unusable = false; workaround_available = null; }
    else if (impact === 'suggestion') { system_unusable = false; workaround_available = null; }

    try {
      const res = await issueService.createTicket({
        title: generateTitle(),
        description,
        reporter_id: user?.id,
        reporter_name: formDraft.reporter_name,
        reporter_email: formDraft.reporter_email,
        reporter_team: formDraft.reporter_team,
        product_area_id: formDraft.product_area_id || null,
        feature_id: formDraft.feature_id || null,
        issue_type_id: formDraft.issue_type_id || null,
        merchant_name: formDraft.merchant_name || '',
        merchant_id: formDraft.merchant_id || '',
        merchant_phone: formDraft.merchant_phone || '',
        system_unusable,
        workaround_available,
        ...autoCapture,
        expected_behaviour: '',
        actual_behaviour: '',
        business_impact: '',
        affected_user_count: null,
        issue_frequency: '',
        reporter_phone: '',
        app_version: '',
        suggested_priority_id: null,
        priority_id: null,
        attachments: uploadedFiles.filter(f => f.status === 'done').map(f => ({
          storage_key: f.storage_key,
          original_name: f.original_name,
          mime_type: f.mime_type,
          file_size: f.file_size,
        })),
        custom_fields: [],
      });

      const ticket = res.ticket;

      for (const file of uploadedFiles.filter(f => f.status === 'done')) {
        if (file.storage_key) {
          await issueService.linkAttachment(ticket.id, {
            storage_key: file.storage_key,
            original_name: file.original_name,
            mime_type: file.mime_type,
            file_size: file.file_size,
          });
        }
      }

      setSubmitted(ticket);
      localStorage.removeItem('issue_form_draft');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to submit issue. Please try again.');
    }
    setSubmitting(false);
  };

  const isValid = () => {
    if (!formDraft.reporter_name || !formDraft.reporter_team || !formDraft.reporter_email) return false;
    if (!formDraft.product_area_id && !isOtherSelected('product_area')) return false;
    if (isOtherSelected('product_area') && !otherTextField('product_area')) return false;
    if (!formDraft.feature_id && !isOtherSelected('feature')) return false;
    if (isOtherSelected('feature') && !otherTextField('feature')) return false;
    if (!formDraft.issue_type_id && !isOtherSelected('issue_type')) return false;
    if (isOtherSelected('issue_type') && !otherTextField('issue_type')) return false;
    if (!formDraft.description) return false;
    if (!formDraft.impact) return false;
    if (uploadingCount > 0) return false;
    return true;
  };

  if (submitted) {
    return (
      <div className="mx-auto py-8 px-4" style={{ maxWidth: '720px' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-emerald-100 p-8 text-center space-y-6 shadow-lg">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-gray-900">Issue submitted successfully</h1>
            <p className="text-gray-500 text-sm">Thank you. Your issue has been reported and a team member will follow up.</p>
          </div>
          <div className="inline-flex items-center gap-3 bg-gray-50 rounded-xl px-6 py-3 border border-gray-200">
            <span className="text-sm font-bold text-gray-500">Ticket ID:</span>
            <span className="text-lg font-black font-mono text-[#e83330]">{submitted.ticket_number}</span>
            <button onClick={() => navigator.clipboard.writeText(submitted.ticket_number)}
              className="p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer" title="Copy ticket ID">
              <Copy size={14} className="text-gray-400" />
            </button>
          </div>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><Info size={14} /> {new Date(submitted.created_at).toLocaleString()}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold`}
              style={{ backgroundColor: submitted.status_colour + '20', color: submitted.status_colour }}>
              {submitted.status_name}
            </span>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button onClick={() => navigate(`/issues/${submitted.id}`)}
              className="px-5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2">
              <ExternalLink size={14} /> View ticket
            </button>
            <button onClick={() => {
              setSubmitted(null);
              setFormDraft({});
              setUploadedFiles([]);
              setError('');
              setShowMerchant(false);
              setShowAdditional(false);
              setFeatures([]);
              setIssueTypes([]);
            }}
              className="px-5 py-2.5 bg-[#e83330] text-white rounded-lg text-sm font-bold hover:bg-[#c82e2c] transition-colors cursor-pointer flex items-center gap-2">
              <Plus size={14} /> Report another issue
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const activeCustomFields = (config?.customFields || []).filter(f => f.active);
  const customFieldsWarning = activeCustomFields.length > 3;

  return (
    <div className="mx-auto py-6 px-4" style={{ maxWidth: '720px' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Report an issue</h1>
        <p className="text-sm text-gray-500 mt-1">Help us improve Pathao Commerce by reporting any problem you encounter.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700 font-semibold">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 space-y-6">
          {/* 1. Reporter */}
          <section>
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-3">
              <Info size={15} className="text-[#e83330]" />
              <h2 className="font-extrabold text-gray-900 text-base">Reporter</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Reporter name <span className="text-red-500">*</span></label>
                <input type="text" value={formDraft.reporter_name || ''} onChange={e => updateField('reporter_name', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 focus:border-[#e83330]" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Team <span className="text-red-500">*</span></label>
                <select value={formDraft.reporter_team || ''} onChange={e => updateField('reporter_team', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 focus:border-[#e83330] bg-white cursor-pointer">
                  <option value="">Select team...</option>
                  <option value="Courier">Courier</option>
                  <option value="Pay">Pay</option>
                  <option value="Courier CX">Courier CX</option>
                  <option value="Pay CX">Pay CX</option>
                  <option value="Commerce support">Commerce support</option>
                  <option value="External">External</option>
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-gray-700">Work email <span className="text-red-500">*</span></label>
                <input type="email" value={formDraft.reporter_email || ''} onChange={e => updateField('reporter_email', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 focus:border-[#e83330]" />
              </div>
            </div>
          </section>

          {/* 2. Issue Category */}
          <section>
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-3">
              <FileText size={15} className="text-[#e83330]" />
              <h2 className="font-extrabold text-gray-900 text-base">Issue category</h2>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Product area <span className="text-red-500">*</span></label>
                <select value={formDraft.product_area_other ? 'other' : (formDraft.product_area_id || '')} onChange={e => handleAreaChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 focus:border-[#e83330] bg-white cursor-pointer">
                  <option value="">Select product area...</option>
                  {getAreaOptions().map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                {isOtherSelected('product_area') && (
                  <input type="text" value={otherTextField('product_area')} onChange={e => updateField('product_area_other_text', e.target.value)}
                    placeholder="Specify product area"
                    className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 focus:border-[#e83330]" />
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Feature <span className="text-red-500">*</span></label>
                <select value={formDraft.feature_other ? 'other' : (formDraft.feature_id || '')} onChange={e => handleFeatureChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 focus:border-[#e83330] bg-white cursor-pointer">
                  <option value="">Select feature...</option>
                  {getFeatureOptions().map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                {isOtherSelected('feature') && (
                  <input type="text" value={otherTextField('feature')} onChange={e => updateField('feature_other_text', e.target.value)}
                    placeholder="Specify feature"
                    className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 focus:border-[#e83330]" />
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Issue type <span className="text-red-500">*</span></label>
                <select value={formDraft.issue_type_other ? 'other' : (formDraft.issue_type_id || '')} onChange={e => {
                  const val = e.target.value;
                  if (val === 'other') {
                    updateField('issue_type_other', true);
                    updateField('issue_type_id', '');
                  } else {
                    updateField('issue_type_id', val);
                    updateField('issue_type_other', false);
                    updateField('issue_type_other_text', '');
                  }
                }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 focus:border-[#e83330] bg-white cursor-pointer">
                  <option value="">Select issue type...</option>
                  {getIssueTypeOptions().map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {isOtherSelected('issue_type') && (
                  <input type="text" value={otherTextField('issue_type')} onChange={e => updateField('issue_type_other_text', e.target.value)}
                    placeholder="Specify issue type"
                    className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 focus:border-[#e83330]" />
                )}
              </div>
            </div>
          </section>

          {/* 3. What Happened */}
          <section>
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-3">
              <HelpCircle size={15} className="text-[#e83330]" />
              <h2 className="font-extrabold text-gray-900 text-base">What happened?</h2>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Describe the issue <span className="text-red-500">*</span></label>
              <textarea value={formDraft.description || ''} onChange={e => updateField('description', e.target.value)} rows={4}
                placeholder="What were you trying to do, and what went wrong? Include any error message you saw."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 focus:border-[#e83330]" />
            </div>
          </section>

          {/* 4. Merchant Information */}
          <section>
            <button type="button" onClick={() => setShowMerchant(!showMerchant)}
              className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors cursor-pointer">
              {showMerchant ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              Add merchant information
            </button>
            {showMerchant && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Merchant name</label>
                    <input type="text" value={formDraft.merchant_name || ''} onChange={e => updateField('merchant_name', e.target.value)}
                      placeholder="e.g. Rahim's Fashion"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 focus:border-[#e83330]" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Merchant ID / Courier Merchant ID</label>
                    <input type="text" value={formDraft.merchant_id || ''} onChange={e => updateField('merchant_id', e.target.value)}
                      placeholder="e.g. M-8022"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 focus:border-[#e83330]" />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-bold text-gray-700">Merchant phone number</label>
                    <input type="tel" value={formDraft.merchant_phone || ''} onChange={e => updateField('merchant_phone', e.target.value)}
                      placeholder="e.g. 017XXXXXXXX"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 focus:border-[#e83330]" />
                  </div>
                </div>
              </motion.div>
            )}
          </section>

          {/* 5. Evidence */}
          <section>
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-3">
              <Paperclip size={15} className="text-[#e83330]" />
              <h2 className="font-extrabold text-gray-900 text-base">Evidence</h2>
            </div>
            <p className="text-xs text-gray-500 mb-3">Screenshots or screen recordings help us understand the issue faster.</p>
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onPaste={handlePaste}
              className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#e83330]/40 transition-colors cursor-pointer bg-gray-50/50"
              onClick={() => fileInputRef.current?.click()}
              tabIndex={0}
            >
              <Upload size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-semibold text-gray-600">Drag & drop files, browse, or paste screenshots</p>
              <p className="text-xs text-gray-400 mt-1">Images, screen recordings, videos, PDFs, documents, logs</p>
              <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,.pdf,.csv,.xlsx,.txt,.json,.log,.doc,.docx"
                onChange={e => { if (e.target.files) addFiles(Array.from(e.target.files)); }}
                className="hidden" />
            </div>
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadedFiles.map(f => (
                  <div key={f.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                      {f.mime_type.startsWith('image/') ? <Image size={16} className="text-blue-500" /> :
                       f.mime_type.startsWith('video/') ? <Film size={16} className="text-purple-500" /> :
                       <FileText size={16} className="text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-700 truncate">{f.original_name}</p>
                      <p className="text-[11px] text-gray-400">{(f.file_size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {f.status === 'uploading' && <Loader2 size={14} className="text-blue-500 animate-spin" />}
                      {f.status === 'done' && <CheckCircle2 size={14} className="text-emerald-500" />}
                      {f.status === 'error' && (
                        <button onClick={() => retryUpload(f.id)} className="text-xs text-red-500 font-bold hover:underline cursor-pointer">Retry</button>
                      )}
                      <button onClick={() => removeFile(f.id)} className="p-1 hover:bg-gray-200 rounded cursor-pointer">
                        <Trash2 size={13} className="text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 6. Impact */}
          <section>
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-3">
              <AlertTriangle size={15} className="text-[#e83330]" />
              <h2 className="font-extrabold text-gray-900 text-base">Impact</h2>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">How serious is the issue? <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-1 gap-2">
                {IMPACT_OPTIONS.map(opt => {
                  const selected = formDraft.impact === opt.value;
                  const Icon = opt.icon;
                  return (
                    <button key={opt.value} type="button" onClick={() => updateField('impact', opt.value)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        selected
                          ? `${opt.bg} ${opt.border} ring-2 ${opt.ring}`
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        selected ? `${opt.bg} ${opt.color}` : 'bg-gray-100 text-gray-400'
                      }`}>
                        <Icon size={16} />
                      </div>
                      <span className={`text-sm font-bold ${selected ? opt.color : 'text-gray-700'}`}>{opt.label}</span>
                      {selected && (
                        <div className="ml-auto w-5 h-5 rounded-full bg-[#e83330] flex items-center justify-center">
                          <CheckCircle2 size={12} className="text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Custom Fields */}
          {activeCustomFields.length > 0 && (
            <section>
              <button type="button" onClick={() => setShowAdditional(!showAdditional)}
                className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors cursor-pointer">
                {showAdditional ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                Additional Information
              </button>
              {customFieldsWarning && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                  <AlertTriangle size={12} className="text-amber-600" />
                  <span className="text-[11px] font-semibold text-amber-800">More than three custom fields are enabled. Consider simplifying the form.</span>
                </div>
              )}
              {showAdditional && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                  {activeCustomFields.map(field => {
                    const fieldKey = `cf_${field.field_key}`;
                    const value = formDraft[fieldKey] || '';
                    return (
                      <div key={field.id} className="space-y-1">
                        <label className="text-xs font-bold text-gray-700">
                          {field.label}
                          {field.required ? <span className="text-red-500"> *</span> : null}
                        </label>
                        {field.help_text && <p className="text-[11px] text-gray-400">{field.help_text}</p>}
                        {field.field_type === 'textarea' ? (
                          <textarea value={value} onChange={e => updateField(fieldKey, e.target.value)} rows={3}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 focus:border-[#e83330]" />
                        ) : (
                          <input type="text" value={value} onChange={e => updateField(fieldKey, e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 focus:border-[#e83330]" />
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors cursor-pointer">
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-400">Saved automatically</span>
            {uploadingCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-blue-600 font-semibold">
                <Loader2 size={12} className="animate-spin" /> Uploading {uploadingCount} file{uploadingCount > 1 ? 's' : ''}...
              </span>
            )}
            {haveErrors && (
              <span className="text-xs text-red-500 font-semibold">Some files failed to upload</span>
            )}
            <button onClick={handleSubmit} disabled={!isValid() || submitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#e83330] text-white rounded-lg text-sm font-bold hover:bg-[#c82e2c] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer">
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {submitting ? 'Submitting...' : 'Submit Issue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
