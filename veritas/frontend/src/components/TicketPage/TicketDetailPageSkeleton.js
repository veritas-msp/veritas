import React from "react";
import { Icon } from "@iconify/react";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import td from "./TicketDetailPage.module.css";
import sales from "./TicketSalesDetailPage.module.css";
import sk from "./TicketDetailPageSkeleton.module.css";

function Bone({ className = "", style }) {
  return <span className={`${sk.bone} ${className}`.trim()} style={style} aria-hidden />;
}

function PaneSection({ lines = 4 }) {
  return (
    <>
      <Bone className={sk.sectionHead} />
      <div className={sk.fieldStack} aria-hidden>
        {Array.from({ length: lines }, (_, index) => (
          <div key={index}>
            <Bone className={sk.fieldLabel} />
            <Bone className={sk.fieldInput} style={{ marginTop: "0.35rem" }} />
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * Skeleton aligned with TicketDetail / TicketSalesDetail layouts
 * to avoid visual jumps while loading.
 */
export default function TicketDetailPageSkeleton({
  variant = "support",
  loadingAria = "Chargement…",
  onBack,
  backAria = "Retour"
}) {
  const isSales = variant === "sales";

  return (
    <div className={`${layout.page} ${td.ticketDetailPage} ${isSales ? sales.page : ""} msp-page-grid`.trim()} aria-busy="true" aria-label={loadingAria}>
      <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull} ${td.shell}`}>
        <header className={`${td.ticketChromeBar} ${td.ticketHeaderBar}`}>
          <button type="button" className={td.ticketHeaderIconBtn} onClick={onBack} aria-label={backAria} disabled={!onBack}>
            <Icon icon="mdi:arrow-left" aria-hidden />
          </button>
          <div className={td.ticketHeroTrack} aria-hidden>
            <Bone className={sk.familyIcon} />
            <Bone className={sk.numberBar} />
            <span className={td.ticketHeroSep}>|</span>
            <div className={td.ticketHeroLead}>
              <Bone className={sk.titleBar} />
              <div className={td.ticketHeroAfter}>
                <span className={td.ticketHeroSep}>|</span>
                <Bone className={sk.badgePill} />
              </div>
            </div>
          </div>
          <div className={td.ticketHeaderRight} aria-hidden>
            <Bone className={sk.headerIcon} />
            <Bone className={sk.headerIcon} />
          </div>
        </header>

        <div className={td.workspace}>
          <div className={`${td.layout} ${isSales ? sales.layout : ""}`.trim()}>
            <aside className={td.leftPane} aria-hidden>
              <PaneSection lines={5} />
              <PaneSection lines={2} />
            </aside>

            <section className={`${td.centerPane} ${isSales ? sales.centerPane : ""}`.trim()} aria-hidden>
              {isSales ? (
                <div className={sales.centerStack}>
                  <div className={sk.centerTabs}>
                    <Bone className={sk.centerTab} />
                    <Bone className={sk.centerTab} />
                    <Bone className={sk.centerTab} />
                  </div>
                  <div className={sk.centerPanel}>
                    <div className={sk.chatBubbleRow}>
                      <Bone className={sk.chatAvatar} />
                      <Bone className={`${sk.chatBubble} ${sk.chatBubbleTall}`} />
                    </div>
                    <div className={`${sk.chatBubbleRow} ${sk.chatBubbleRowOut}`}>
                      <Bone className={sk.chatAvatar} />
                      <Bone className={sk.chatBubble} />
                    </div>
                    <div className={sk.chatBubbleRow}>
                      <Bone className={sk.chatAvatar} />
                      <Bone className={sk.chatBubble} />
                    </div>
                    <Bone className={sk.replyBox} />
                  </div>
                </div>
              ) : (
                <>
                  <div className={td.timelineWrap}>
                    <div className={td.timeline} style={{ alignItems: "flex-start" }}>
                      <div className={sk.chatBubbleRow}>
                        <Bone className={sk.chatAvatar} />
                        <Bone className={`${sk.chatBubble} ${sk.chatBubbleTall}`} />
                      </div>
                      <div className={`${sk.chatBubbleRow} ${sk.chatBubbleRowOut}`}>
                        <Bone className={sk.chatAvatar} />
                        <Bone className={sk.chatBubble} />
                      </div>
                      <div className={sk.chatBubbleRow}>
                        <Bone className={sk.chatAvatar} />
                        <Bone className={sk.chatBubble} />
                      </div>
                      <div className={`${sk.chatBubbleRow} ${sk.chatBubbleRowOut}`}>
                        <Bone className={sk.chatAvatar} />
                        <Bone className={sk.chatBubble} />
                      </div>
                    </div>
                  </div>
                  <Bone className={sk.replyBox} />
                </>
              )}
            </section>

            <aside className={`${td.rightPane} ${isSales ? sales.rightPane : ""}`.trim()} aria-hidden>
              <div className={sk.rightSection}>
                <Bone className={sk.sectionHead} style={{ margin: 0 }} />
                <Bone className={sk.rightLine} />
                <Bone className={`${sk.rightLine} ${sk.rightLineShort}`} />
                <Bone className={sk.rightLine} />
              </div>
              <div className={sk.rightSection}>
                <Bone className={sk.sectionHead} style={{ margin: 0 }} />
                <Bone className={sk.rightLine} />
                <Bone className={`${sk.rightLine} ${sk.rightLineShort}`} />
              </div>
            </aside>

            <aside className={td.rightSidebar} aria-hidden>
              <Bone className={sk.railBtn} />
              <Bone className={sk.railBtn} />
              <Bone className={sk.railBtn} />
            </aside>
          </div>

          {!isSales ? (
            <div className={`${td.ticketChromeBar} ${td.footerBar} ${sk.footerBar}`} aria-hidden>
              <Bone className={sk.footerBtn} />
              <Bone className={`${sk.footerBtn} ${sk.footerBtnWide}`} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
