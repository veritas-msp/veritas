import { useEffect, useMemo, useState } from "react";
import { addClient, updateClient, saveClientModules, addContact, updateContact } from "../../../api/clients";
import { showError, showSuccess } from "../../../utils/toast";
import { buildContactApiPayload } from "../../../utils/contactCommunications";
import MultiStepModal from "../../Misc/Modal/MultiStepModal";
import StepGeneralInfo from "./ClientSteps/StepGeneralInfo";
import StepContractOptions from "./ClientSteps/StepContractOptions";
import EnterpriseFormModal from "../../EnterprisesPage/EnterpriseFormModal";
import { useContractModuleOptions } from "../../../hooks/useContractModuleOptions";
import { useVeritasEdition } from "../../../hooks/useVeritasEdition";
import { useAppLocale } from "../../../hooks/useAppGeneralSettings";
import { buildEmptyModulesMap, normalizeClientOptions } from "../../../constants/contractModules";
import { localizeContractModules } from "../../../i18n/contractModuleLabels";
import { getEnterpriseFormModalCopy } from "../../EnterprisesPage/enterpriseFormModalI18n";
import { normalizeClientSlaInContrat, createDefaultClientSla } from "../../../utils/ticketSlaUtils";
import { normalizeLegalIdentifier } from "../../../utils/siret";
import { getClientNumber } from "../../../utils/clientDisplay";
const splitAddress = address => {
  if (!address) {
    return {
      addressStreet: "",
      addressPostalCode: "",
      addressCity: ""
    };
  }
  const trimmed = address.trim();
  const match = trimmed.match(/^(.+?),\s*(\d{4,5})\s+(.+)$/);
  if (match) {
    return {
      addressStreet: match[1].trim(),
      addressPostalCode: match[2].trim(),
      addressCity: match[3].trim()
    };
  }
  return {
    addressStreet: trimmed,
    addressPostalCode: "",
    addressCity: ""
  };
};
const defaultClient = {
  clientNumber: "",
  name: "",
  commercial: "",
  siret: "",
  address: "",
  addressStreet: "",
  addressPostalCode: "",
  addressCity: "",
  secteur: "",
  sites: [],
  ssids: [],
  contrat: {
    debut: "",
    expiration: "",
    type: "",
    sla: createDefaultClientSla()
  },
  modules: {},
  primaryContact: {
    nom: "",
    prenom: "",
    sexe: "",
    email: "",
    telephone: "",
    poste: "",
    communications: []
  },
  equipements: {
    Serveurs: [],
    NAS: [],
    Firewalls: [],
    Sauvegarde: {
      logiciel: "Veeam",
      version: "",
      expiration: "",
      jobs: []
    },
    Antivirus: {
      logiciel: "BitDefender",
      expiration: "",
      stationsWindows: 0,
      ServeursWindows: 0,
      macos: 0,
      machinesPhysicals: 0,
      machinesVirtualles: 0
    },
    Antispam: {
      logiciel: "MailInBlack",
      expiration: "",
      usersProteges: 0,
      domainsSurveilles: 0
    },
    NDD: [],
    Office365: {
      licences: []
    }
  }
};
export default function ClientModal({
  initialClient,
  onClose,
  onSaved
}) {
  const isEditing = Boolean(initialClient);
  const locale = useAppLocale();
  const copy = useMemo(() => getEnterpriseFormModalCopy(locale), [locale]);
  const {
    isCommunity
  } = useVeritasEdition();
  const {
    modules: contractModules,
    enabledModules
  } = useContractModuleOptions();
  const localizedEnabledModules = useMemo(() => localizeContractModules(enabledModules, locale), [enabledModules, locale]);
  const emptyModules = useMemo(() => buildEmptyModulesMap(contractModules), [contractModules]);
  const [form, setForm] = useState(isEditing ? {
    id: initialClient.id,
    clientNumber: getClientNumber(initialClient) || "",
    name: initialClient.name,
    siret: normalizeLegalIdentifier(initialClient.siret || initialClient.siren || ""),
    address: initialClient.address || "",
    ...splitAddress(initialClient.address),
    secteur: initialClient.secteur || initialClient.sector || "",
    commercial: initialClient.commercialId || initialClient.commercial_id || "",
    sites: initialClient.sites || [],
    ssids: initialClient.ssid || initialClient.ssids || [],
    contrat: normalizeClientSlaInContrat({
      debut: initialClient.contrat?.debut || "",
      expiration: initialClient.contrat?.expiration || "",
      type: initialClient.contrat?.type || "",
      sla: initialClient.contrat?.sla
    }),
    modules: normalizeClientOptions(initialClient.options || initialClient.modules || {}, contractModules),
    equipements: initialClient.equipements || {}
  } : {
    ...defaultClient,
    modules: {
      ...emptyModules
    }
  });
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      modules: normalizeClientOptions(prev.modules, contractModules)
    }));
  }, [contractModules]);
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const steps = isEditing ? [{
    label: copy.clientModal.stepGeneral,
    component: StepGeneralInfo,
    key: "general",
    icon: "mdi:office-building"
  }, {
    label: copy.clientModal.stepContract,
    component: StepContractOptions,
    key: "contract",
    icon: "mdi:file-document-edit"
  }] : [];
  const CurrentStepComponent = steps[currentStep]?.component;
  const progress = steps.length ? (currentStep + 1) / steps.length * 100 : 0;
  const validateCreateForm = () => {
    const m = copy.clientModal;
    if (!form.name.trim()) {
      showError(m.nameRequired);
      return false;
    }
    if (!form.primaryContact?.nom?.trim()) {
      showError(m.contactNameRequired);
      return false;
    }
    const contactEmail = form.primaryContact?.email?.trim();
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      showError(m.contactEmailInvalid);
      return false;
    }
    return true;
  };
  const validateStep = () => {
    const m = copy.clientModal;
    const step = steps[currentStep];
    if (step?.key === "general") {
      if (!form.name.trim()) {
        showError(m.clientNameRequired);
        return false;
      }
    }
    if (step?.key === "contract") {
      if (!form.contrat?.type) {
        showError(m.contractTypeRequired);
        return false;
      }
      if (!form.contrat?.debut || !form.contrat?.expiration) {
        showError(m.contractDatesRequired);
        return false;
      }
      const atLeastOne = Object.values(form.modules || {}).some(Boolean);
      if (!atLeastOne) {
        showError(m.moduleRequired);
        return false;
      }
    }
    return true;
  };
  const submitClient = async () => {
    if (!isEditing && !validateCreateForm()) return;
    const street = form.addressStreet?.trim();
    const postal = form.addressPostalCode?.trim();
    const city = form.addressCity?.trim();
    let fullAddress = form.address?.trim() || "";
    if (street || postal || city) {
      const cityPart = [postal, city].filter(Boolean).join(" ");
      fullAddress = [street, cityPart].filter(Boolean).join(", ");
    }
    const contratPayload = normalizeClientSlaInContrat({
      ...form.contrat,
      type: form.contrat?.type || "PROFESSIONNEL"
    });
    const normalizedSiret = normalizeLegalIdentifier(form.siret);
    const payload = {
      clientNumber: form.clientNumber?.trim() || null,
      name: form.name?.trim() || '',
      contrat: contratPayload,
      options: form.modules,
      sites: form.sites || [],
      commercialId: form.commercial || null,
      siret: normalizedSiret || null,
      address: fullAddress,
      secteur: form.secteur?.trim() || ""
    };
    try {
      setSaving(true);
      if (isEditing) {
        await updateClient(form.id, payload);
        await saveClientModules(form.id, {
          modules: form.modules
        });
      } else {
        const newClient = await addClient(payload);
        if (newClient?.id) {
          await saveClientModules(newClient.id, {
            modules: form.modules
          });
          const contact = form.primaryContact || {};
          if (contact.nom?.trim()) {
            try {
              const contactPayload = buildContactApiPayload({
                nom: contact.nom.trim(),
                prenom: contact.prenom?.trim() || null,
                sexe: contact.sexe?.trim() || null,
                email: contact.email?.trim() || null,
                telephone: contact.telephone?.trim() || null,
                communications: contact.communications,
                poste: contact.poste?.trim().toUpperCase() || "CONTACT PRINCIPAL",
                statut: "actif",
                client_id: newClient.id
              });
              if (contact.id) {
                await updateContact(contact.id, contactPayload);
              } else {
                await addContact(contactPayload);
              }
            } catch (contactError) {
              console.error("Erreur création contact principal:", contactError);
              showError(contactError.message || copy.clientModal.contactSaveFailed);
              if (typeof onSaved === "function") {
                try {
                  await onSaved();
                } catch (e) {
                  console.error("Erreur lors du rafraîchissement après sauvegarde:", e);
                }
              }
              onClose();
              return;
            }
          }
        }
      }
      showSuccess(copy.clientModal.saveSuccess);
      if (typeof onSaved === "function") {
        try {
          await onSaved();
        } catch (e) {
          console.error("Erreur lors du rafraîchissement après sauvegarde:", e);
        }
      }
      onClose();
    } catch (error) {
      console.error("Erreur détaillée lors de l'enregistrement:", error);
      const errorMessage = error.message || copy.clientModal.saveFailed;
      showError(errorMessage);
    } finally {
      setSaving(false);
    }
  };
  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        submitClient();
      }
    }
  };
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  if (!isEditing) {
    return <EnterpriseFormModal open mode="create" form={form} setForm={setForm} enabledModules={localizedEnabledModules} isCommunity={isCommunity} saving={saving} onClose={onClose} onSubmit={submitClient} />;
  }
  return <MultiStepModal isOpen onClose={onClose} closeOnOverlayClick={isEditing} steps={steps} currentStep={currentStep} onPrevious={currentStep > 0 ? handlePrevious : undefined} onPrimary={handleNext} primaryLabel={currentStep === steps.length - 1 ? isEditing ? copy.clientModal.saveEdit : copy.create : copy.clientModal.next} primaryIcon={currentStep === steps.length - 1 ? "mdi:check" : "mdi:arrow-right"} saving={saving} size={isEditing ? "large" : "large"} showPrimaryLabel>
      <CurrentStepComponent form={form} setForm={setForm} isEditing={isEditing} />
    </MultiStepModal>;
}
