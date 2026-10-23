import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useAuthContext } from "../../contexts/AuthContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useProfileAccess } from "../../hooks/useProfileAccess";
import { fetchHomeDashboard } from "../../api/stats";
import HomeTechNewsColumn from "./HomeTechNewsColumn";
import HomeSupervisionSection from "./HomeSupervisionSection";
import { getHomePageCopy } from "./homePageI18n";
import PageGuideTour from "../PageGuide/PageGuideTour";
import { getHomePageGuideSteps } from "../PageGuide/homePageGuideSteps";
import { useRegisterPageGuide } from "../../hooks/useRegisterPageGuide";
import HomePageSkeleton from "./HomePageSkeleton";
import { UiKitAlert, UiKitButton, UiKitHomeShell } from "../UiKit";
import styles from "./HomePage.module.css";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";

function formatDisplayNameFromEmailLocal(local) {
  if (!local) return "";
  const parts = local.split(/[._+-]+/).map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return "";
  return parts.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
}

export default function HomePage({ onNavigate, isCommunity = false }) {
  const { user } = useAuthContext();
  const access = useProfileAccess(user?.profile);
  const locale = useAppLocale();
  const [dashboard, setDashboard] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const openPageGuide = useCallback(() => setPageGuideOpen(true), []);
  useRegisterPageGuide(openPageGuide);
  const abortRef = useRef(null);

  const userName = useMemo(() => {
    const pseudo = String(user?.username || "").trim();
    if (pseudo) return pseudo;
    if (!user?.email) return "";
    const local = user.email.split("@")[0];
    return formatDisplayNameFromEmailLocal(local);
  }, [user]);

  const copy = useMemo(() => getHomePageCopy(locale), [locale]);

  const loadDashboard = useCallback(
    (options = {}) => {
      const { soft = false } = options;
      if (abortRef.current) abortRef.current.abort();
      const controller = createTrackedAbortController();
      abortRef.current = controller;
      if (!soft) setLoading(true);
      setLoadError("");
      fetchHomeDashboard({ signal: controller.signal })
        .then(dashboardData => {
          setDashboard(dashboardData);
        })
        .catch(err => {
          if (err.name === "AbortError") return;
          setLoadError(err.message || copy.errorLoad);
          if (!soft) setDashboard(null);
        })
        .finally(() => {
          if (abortRef.current !== controller) return;
          setLoading(false);
        });
    },
    [copy.errorLoad]
  );

  useEffect(() => {
    loadDashboard();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [loadDashboard]);

  const navigate = useCallback(
    (type, data) => {
      if (typeof onNavigate === "function") onNavigate(type, data);
    },
    [onNavigate]
  );

  const homeGuideSteps = useMemo(
    () => getHomePageGuideSteps({ isCommunity, locale }),
    [isCommunity, locale]
  );

  const canAccessSupport = access.Ticket !== false;
  const canAccessSales = access.TicketSales !== false;
  const canAccessPlanning = access.Planning !== false;
  const canAccessSupervision = access.Hardware !== false;
  const showSupportTickets = canAccessSupport;
  const showSalesTickets = !isCommunity && canAccessSales;
  const showEvents = !isCommunity && canAccessPlanning;
  const showSupervision = !isCommunity && canAccessSupervision;

  const errorBanner = loadError ? (
    <UiKitAlert
      tone="danger"
      className={styles.errorBannerKit}
      action={
        <UiKitButton variant="secondary" onClick={() => loadDashboard()}>
          {copy.retry}
        </UiKitButton>
      }
    >
      {loadError}
    </UiKitAlert>
  ) : null;

  const news = <HomeTechNewsColumn locale={locale} layout="grid" />;

  if (showSupervision) {
    const showDashboardSkeleton = loading && !dashboard;
    return (
      <div className={styles.pageWrapper}>
        {showDashboardSkeleton ? (
          <HomePageSkeleton label={copy.loading} showNews />
        ) : (
          <UiKitHomeShell
            top={
              <>
                {errorBanner}
                <HomeSupervisionSection
                  copy={copy}
                  locale={locale}
                  userName={userName}
                  assignedTicketStats={dashboard?.assignedTicketStats || null}
                  recentTickets={dashboard?.recentTickets || []}
                  upcomingEvents={dashboard?.upcomingEvents || []}
                  showSupportTickets={showSupportTickets}
                  showSalesTickets={showSalesTickets}
                  showEvents={showEvents}
                  onNavigate={navigate}
                />
              </>
            }
            bottom={news}
          />
        )}
        <PageGuideTour
          open={pageGuideOpen}
          steps={homeGuideSteps}
          title={copy.guide.tourTitle}
          locale={locale}
          onClose={() => setPageGuideOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <UiKitHomeShell
        top={
          <>
            {errorBanner}
            <HomeSupervisionSection
              copy={copy}
              locale={locale}
              userName={userName}
              assignedTicketStats={dashboard?.assignedTicketStats || null}
              recentTickets={dashboard?.recentTickets || []}
              upcomingEvents={dashboard?.upcomingEvents || []}
              showSupportTickets={showSupportTickets}
              showSalesTickets={false}
              showEvents={false}
              onNavigate={navigate}
            />
          </>
        }
        bottom={news}
      />
      <PageGuideTour
        open={pageGuideOpen}
        steps={homeGuideSteps}
        title={copy.guide.tourTitle}
        locale={locale}
        onClose={() => setPageGuideOpen(false)}
      />
    </div>
  );
}
