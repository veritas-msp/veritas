import UiKitPageHero from "./UiKitPageHero";
import styles from "../uiKitHome.module.css";

/**
 * Board Accueil UI Kit.
 * Colonne gauche : salutation (gros titre) + événements.
 * Colonne droite : tickets (cartes empilées).
 */

export default function UiKitHomeBoard({
  title,
  titleMark = null,
  subtitle = null,
  guideId = "home-hero",
  events = null,
  tickets = null,
  className = ""
}) {
  const boardClass = [
    styles.homeBoard,
    events ? styles.homeBoardWithEvents : styles.homeBoardTicketsOnly
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={`${styles.homeBoardRoot}${className ? ` ${className}` : ""}`}
      data-guide="home-supervision"
      data-home-section="supervision"
    >
      <div className={boardClass}>
        <div className={styles.homeBoardLeft}>
          <UiKitPageHero
            bare
            className={styles.homeBoardGreeting}
            guideId={guideId}
            title={
              titleMark ? (
                <span className={styles.homeGreetingLine}>
                  <span className={styles.homeGreetingText}>{title}</span>
                  {/* Noto Emoji Animation, CC BY 4.0 — https://googlefonts.github.io/noto-emoji-animation/ */}
                  <img
                    className={styles.greetingEmoji}
                    src="/assets/emoji/waving-hand.webp"
                    alt=""
                    draggable={false}
                  />
                </span>
              ) : (
                title
              )
            }
            subtitle={subtitle}
          />
          {events ? (
            <div className={styles.homeBoardEvents} data-guide="home-events">
              {events}
            </div>
          ) : null}
        </div>

        {tickets ? <div className={styles.homeBoardTickets}>{tickets}</div> : null}
      </div>
    </section>
  );
}
