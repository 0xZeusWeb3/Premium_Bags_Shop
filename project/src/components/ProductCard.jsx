import { formatPrice, productImageUrl } from '../lib/utils';

export default function ProductCard({ product, index, onAdd }) {
  const displayPrice = product.discount_price || product.price;
  const hasDiscount = product.discount_price && product.discount_price < product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.discount_price / product.price) * 100)
    : 0;

  return (
    <div className="product-card" style={{ background: product.bg_color }}>
      <img
        className="product-card-img"
        src={productImageUrl(product.image_url, 400)}
        alt={product.name}
        width={400}
        height={400}
        decoding="async"
        loading={index < 4 ? 'eager' : 'lazy'}
        fetchPriority={index < 4 ? 'high' : 'auto'}
      />
      <div
        className="product-card-panel"
        style={{ background: product.panel_color, color: product.text_color }}
      >
        <div className="product-card-info">
          <div className="product-card-name">{product.name}</div>
          <div className="product-card-price">
            {hasDiscount && <span className="price-strike">{formatPrice(product.price)}</span>}
            {formatPrice(displayPrice)}
            {hasDiscount && <span className="discount-pill">-{discountPct}%</span>}
          </div>
        </div>
        <button
          type="button"
          className="btn-add"
          aria-label="Add to cart"
          style={{ color: product.text_color, borderColor: product.text_color }}
          onClick={() => onAdd(product.id)}
        >
          +
        </button>
      </div>
    </div>
  );
}
