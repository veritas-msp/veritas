import styles from "./TicketPage.module.css";

export default function ResizableTableHeaderCell({
  children,
  onClick,
  onResizeStart,
  onResizeAutoFit,
  resizeLabel,
  style,
  className = "",
  sortable = true
}) {
  return (
    <th
      className={`${styles.resizableTh} ${className}`.trim()}
      onClick={sortable ? onClick : undefined}
      style={{
        ...(sortable ? undefined : { cursor: "default" }),
        ...style
      }}
    >
      <span className={styles.thSortInner}>{children}</span>
      <span
        className={styles.colResizeHandle}
        role="separator"
        aria-orientation="vertical"
        aria-label={resizeLabel}
        title={resizeLabel}
        onMouseDown={onResizeStart}
        onDoubleClick={event => {
          event.preventDefault();
          event.stopPropagation();
          onResizeAutoFit?.(event);
        }}
        onClick={event => {
          event.preventDefault();
          event.stopPropagation();
        }}
      />
    </th>
  );
}
