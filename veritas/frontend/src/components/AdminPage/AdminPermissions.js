import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { updatePermissionsMatrix } from "../../api/permissions";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { useAdminCommonCopy } from "../../hooks/useAdminCopy";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getAdminPermissionsCopy } from "./adminPermissionsI18n";
import ProfilePermissionsEditor from "./ProfilePermissionsEditor";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import { Btn, Card, Page } from "./AdminUi";
import s from "./AdminPermissions.module.css";

export default function AdminPermissions() {
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminPermissionsCopy(locale), [locale]);
  const adminCopy = useAdminCommonCopy();
  const {
    isCommunity
  } = useVeritasEdition();
  const [permissionsDraft, setPermissionsDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [matrixReady, setMatrixReady] = useState(false);
  const suppressDirtyRef = useRef(true);

  const permissionsLocked = isCommunity;

  const handleDraftChange = useCallback(next => {
    setPermissionsDraft(next);
    if (suppressDirtyRef.current) {
      suppressDirtyRef.current = false;
      setMatrixReady(true);
      return;
    }
    setDirty(true);
  }, []);

  const handleLoadState = useCallback(state => {
    if (state?.loading) {
      suppressDirtyRef.current = true;
      setDirty(false);
      setMatrixReady(false);
    }
    if (state && !state.loading && !state.error) {
      setMatrixReady(true);
    }
  }, []);

  const handleSave = async () => {
    if (permissionsLocked || !permissionsDraft) return;
    setSaving(true);
    try {
      await updatePermissionsMatrix(permissionsDraft);
      toast.success(copy.saveSuccess);
      setDirty(false);
    } catch (err) {
      toast.error(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  return <Page>
      <div className={s.pageFill} data-page-fill>
        <Card title={copy.pageTitle} description={isCommunity ? copy.pageDescriptionCommunity : copy.pageDescription} fill fillNoScroll action={!permissionsLocked && matrixReady ? <Btn icon="mdi:content-save-outline" onClick={handleSave} disabled={saving || !dirty || !permissionsDraft}>
                {saving ? copy.saving : adminCopy.save || copy.save}
              </Btn> : null}>
          {isCommunity && <p className={s.communityHint}>
              {copy.sectionHintCommunity}{" "}
              <ProFeatureBadge variant="inline" className={s.proBadge} />
            </p>}

          <div className={s.matrixLayout}>
            {dirty && !permissionsLocked ? <div className={s.dirtyBar}>
                <span className={s.dirtyBadge}>{copy.unsaved}</span>
              </div> : null}
            <div className={s.editorBodyFull}>
              <ProfilePermissionsEditor value={permissionsDraft} onChange={handleDraftChange} readOnly={permissionsLocked} onLoadState={handleLoadState} />
            </div>
          </div>
        </Card>
      </div>
    </Page>;
}
