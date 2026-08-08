import { useState, useMemo } from "react";
import React from "react";
import { Icon } from "@iconify/react";
import { FaTimes, FaPaperPlane, FaEnvelope } from "react-icons/fa";
import { toast } from 'react-toastify';
import API_BASE_URL from "../../config";
import { updateCampaignStep } from "../../api/campaigns";
import styles from "./CampaignEmailModal.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getCampaignDetailCopy } from "./campaignDetailI18n";
export default function CampaignEmailModal({
  step,
  campaign,
  clientId,
  campaignId,
  onClose,
  onEmailSent,
  copy
}) {
  const locale = useAppLocale();
  const localCopy = useMemo(() => getCampaignDetailCopy(locale), [locale]);
  const detailCopy = copy || localCopy;
  const emailCopy = detailCopy.email;
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [sending, setSending] = useState(false);
  const handleSend = async () => {
    if (!emailTo || !emailTo.includes('@') || !emailSubject.trim() || !emailContent.trim()) {
      toast.error(emailCopy.toastMissing);
      return;
    }
    try {
      setSending(true);
      const response = await fetch(`${API_BASE_URL}/email/send-campaign-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          content: emailContent,
          stepId: step.id,
          campaignId: campaignId,
          clientId: clientId
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || emailCopy.toastError);
      }
      await updateCampaignStep(clientId, campaignId, step.id, {
        completed: true
      });
      toast.success(emailCopy.toastSent);
      if (onEmailSent) {
        onEmailSent();
      }
    } catch (error) {
      console.error('Error lors de l\'envoi de l\'email:', error);
      toast.error(error.message || emailCopy.toastError);
    } finally {
      setSending(false);
    }
  };
  return <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <FaEnvelope className={styles.modalIcon} />
            <h3>{emailCopy.title}</h3>
          </div>
          <button className={styles.closeButton} onClick={onClose} title={emailCopy.close}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>
              {emailCopy.recipient} <span className={styles.required}>*</span>
            </label>
            <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder={emailCopy.recipientPlaceholder} className={styles.fieldInput} required />
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>
              {emailCopy.subject} <span className={styles.required}>*</span>
            </label>
            <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder={emailCopy.subjectPlaceholder} className={styles.fieldInput} required />
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>
              {emailCopy.body} <span className={styles.required}>*</span>
            </label>
            <textarea value={emailContent} onChange={e => setEmailContent(e.target.value)} placeholder={emailCopy.bodyPlaceholder} className={styles.fieldTextarea} rows={12} required />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose} disabled={sending}>
            <FaTimes />
            {emailCopy.cancel}
          </button>
          <button className={styles.sendButton} onClick={handleSend} disabled={sending || !emailTo || !emailSubject.trim() || !emailContent.trim()}>
            {sending ? <>
                <Icon icon="mdi:loading" className={styles.spinner} />
                {emailCopy.sending}
              </> : <>
                <FaPaperPlane />
                {emailCopy.send}
              </>}
          </button>
        </div>
      </div>
    </div>;
}
