import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { getIconPath } from "../../utils/assetHelper";
import layout from "./EnterpriseFormModal.module.css";
import styles from "./BackupConfigModal.module.css";
import {
  BACKUP_BRAND_OTHER,
  BACKUP_PRODUCT_OTHER,
  buildBrandTiles,
  getBackupBrand,
  getBackupProduct,
  getProductsForBrand,
  resolveBrandIdForProduct,
} from "./backupSoftwareCatalog";

function BrandLogo({ brand }) {
  return (
    <span className={styles.brandTileIconWrap} aria-hidden>
      <Icon
        icon={brand?.iconify || "mdi:backup-restore"}
        className={styles.brandTileIcon}
        width={23}
        height={23}
      />
    </span>
  );
}

function ProductLogo({ product }) {
  if (product?.icon) {
    return (
      <img
        src={getIconPath(product.icon)}
        alt=""
        className={`${styles.productCardLogo} ${styles.typeLogoImg}`}
        draggable={false}
      />
    );
  }
  return (
    <Icon
      icon={product?.iconify || "mdi:backup-restore"}
      className={styles.productCardLogo}
      aria-hidden
    />
  );
}

/**
 * Sélecteur marque → produit (grille aérée style périphériques).
 * onSelect(productId, { brandId, customBrand?, customProduct? })
 */
export default function BackupSoftwarePicker({
  value = "",
  softwareCopy = {},
  labels = {},
  onSelect,
}) {
  const brandLabel = labels.brand || "Marque";
  const productLabel = labels.product || "Produit";
  const otherBrandLabel = labels.otherBrand || "Autre";
  const otherBrandNameLabel = labels.otherBrandName || "Nom de la marque";
  const otherProductLabel = labels.otherProduct || "Autre produit";
  const otherProductNameLabel = labels.otherProductName || "Nom du produit";
  const otherProductDesc = labels.otherProductDesc || "Saisie libre pour un logiciel hors catalogue";

  const brandTiles = useMemo(() => buildBrandTiles(otherBrandLabel), [otherBrandLabel]);

  const knownProduct = getBackupProduct(value);
  const initialBrand = value
    ? knownProduct
      ? knownProduct.brandId
      : resolveBrandIdForProduct(value) || BACKUP_BRAND_OTHER
    : "";

  const [brandId, setBrandId] = useState(initialBrand);
  const [customBrand, setCustomBrand] = useState(
    initialBrand === BACKUP_BRAND_OTHER && value && !knownProduct ? String(value) : ""
  );
  const [customProduct, setCustomProduct] = useState("");
  const [forceOtherProduct, setForceOtherProduct] = useState(
    Boolean(value && !knownProduct && initialBrand !== BACKUP_BRAND_OTHER)
  );
  const [productsAnimKey, setProductsAnimKey] = useState(0);

  useEffect(() => {
    if (!value) return;
    const product = getBackupProduct(value);
    if (product) {
      setBrandId(product.brandId);
      setForceOtherProduct(false);
      setCustomProduct("");
      return;
    }
    const resolved = resolveBrandIdForProduct(value);
    setBrandId(resolved);
    if (resolved === BACKUP_BRAND_OTHER) {
      setCustomBrand(String(value));
    } else {
      setForceOtherProduct(true);
      setCustomProduct(String(value));
    }
  }, [value]);

  const products = useMemo(() => getProductsForBrand(brandId), [brandId]);
  const activeBrand = brandId === BACKUP_BRAND_OTHER
    ? { id: BACKUP_BRAND_OTHER, label: otherBrandLabel, iconify: "mdi:dots-horizontal" }
    : getBackupBrand(brandId);

  const handleBrandSelect = nextBrandId => {
    if (nextBrandId === brandId) return;
    setBrandId(nextBrandId);
    setForceOtherProduct(false);
    setCustomProduct("");
    setProductsAnimKey(k => k + 1);
    if (nextBrandId !== BACKUP_BRAND_OTHER) {
      setCustomBrand("");
    }
  };

  const handleProductSelect = productId => {
    if (productId === BACKUP_PRODUCT_OTHER) {
      setForceOtherProduct(true);
      return;
    }
    setForceOtherProduct(false);
    setCustomProduct("");
    onSelect?.(productId, { brandId });
  };

  const commitCustomProduct = rawName => {
    const name = String(rawName || "").trim();
    if (!name) return;
    onSelect?.(name, {
      brandId: brandId === BACKUP_BRAND_OTHER ? BACKUP_BRAND_OTHER : brandId,
      customBrand: brandId === BACKUP_BRAND_OTHER ? customBrand.trim() || name : undefined,
      customProduct: name,
    });
  };

  const productEntries = [
    ...products.map(product => ({
      key: product.id,
      product,
      info: softwareCopy[product.id],
      selected: value === product.id,
      isOther: false,
    })),
    {
      key: BACKUP_PRODUCT_OTHER,
      product: null,
      info: { label: otherProductLabel, description: otherProductDesc },
      selected: forceOtherProduct,
      isOther: true,
    },
  ];

  return (
    <div className={styles.pickerStack}>
      <div className={`${styles.pickerSection} ${styles.pickerBrands}`}>
        <span className={layout.label}>{brandLabel}</span>
        <div className={styles.brandGrid} role="listbox" aria-label={brandLabel}>
          {brandTiles.map((tile, index) => {
            const active = brandId === tile.id;
            return (
              <button
                key={tile.id}
                type="button"
                role="option"
                aria-selected={active}
                className={`${styles.brandTile} ${active ? styles.brandTileActive : ""}`}
                style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}
                onClick={() => handleBrandSelect(tile.id)}
              >
                {active ? <Icon icon="mdi:check-circle" className={styles.brandTileCheck} aria-hidden /> : null}
                <BrandLogo brand={tile} />
                <span className={styles.brandTileLabel}>{tile.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {brandId === BACKUP_BRAND_OTHER ? (
        <div className={`${styles.pickerSection} ${styles.pickerProducts} ${styles.productsReveal}`} key={`other-${productsAnimKey}`}>
          <label className={layout.label} htmlFor="backup-brand-other">
            {otherBrandNameLabel}
          </label>
          <input
            id="backup-brand-other"
            type="text"
            className={layout.input}
            value={customBrand}
            onChange={e => setCustomBrand(e.target.value)}
            placeholder="Ex. Rubrik, Cohesity…"
            autoFocus
          />
          <label className={layout.label} htmlFor="backup-product-other-free" style={{ marginTop: "0.55rem" }}>
            {otherProductNameLabel}
          </label>
          <div className={styles.customProductRow}>
            <input
              id="backup-product-other-free"
              type="text"
              className={layout.input}
              value={customProduct}
              onChange={e => setCustomProduct(e.target.value)}
              placeholder="Ex. Rubrik CDM"
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitCustomProduct(customProduct);
                }
              }}
            />
            <button
              type="button"
              className={styles.customProductConfirm}
              disabled={!String(customProduct || "").trim()}
              onClick={() => commitCustomProduct(customProduct)}
            >
              <Icon icon="mdi:check" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}

      {brandId && brandId !== BACKUP_BRAND_OTHER ? (
        <div className={`${styles.pickerSection} ${styles.pickerProducts} ${styles.productsReveal}`} key={`${brandId}-${productsAnimKey}`}>
          <span className={layout.label}>
            {productLabel}
            {activeBrand?.label ? ` · ${activeBrand.label}` : ""}
          </span>
          <div className={styles.productGrid} role="listbox" aria-label={productLabel}>
            {productEntries.map((entry, index) => (
              <button
                key={entry.key}
                type="button"
                role="option"
                aria-selected={entry.selected}
                title={entry.info?.description || entry.info?.label}
                className={`${styles.productCard} ${entry.selected ? styles.productCardActive : ""}`}
                style={{ animationDelay: `${40 + index * 45}ms` }}
                onClick={() => handleProductSelect(entry.key)}
              >
                {entry.isOther ? (
                  <Icon icon="mdi:dots-horizontal" className={styles.productCardLogo} aria-hidden />
                ) : (
                  <ProductLogo product={entry.product} />
                )}
                <span className={styles.productCardBody}>
                  <span className={styles.productCardLabel}>{entry.info?.label || entry.key}</span>
                  <span className={styles.productCardDesc}>{entry.info?.description || ""}</span>
                </span>
              </button>
            ))}
          </div>

          {forceOtherProduct ? (
            <div className={`${styles.customProductRow} ${styles.customProductReveal}`} style={{ marginTop: "0.55rem" }}>
              <input
                type="text"
                className={layout.input}
                value={customProduct}
                onChange={e => setCustomProduct(e.target.value)}
                placeholder={otherProductNameLabel}
                aria-label={otherProductNameLabel}
                autoFocus
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitCustomProduct(customProduct);
                  }
                }}
              />
              <button
                type="button"
                className={styles.customProductConfirm}
                disabled={!String(customProduct || "").trim()}
                onClick={() => commitCustomProduct(customProduct)}
              >
                <Icon icon="mdi:check" aria-hidden />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
