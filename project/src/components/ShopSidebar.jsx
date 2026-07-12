import { CATEGORY_GROUPS } from '../lib/utils';

export default function ShopSidebar({
  currentCategory,
  filterAvailable,
  filterDiscount,
  openGroups,
  onCategoryChange,
  onToggleGroup,
  onFilterAvailableChange,
  onFilterDiscountChange,
}) {
  return (
    <aside className="shop-sidebar">
      <div className="sidebar-section">
        <p className="sidebar-label">Collection</p>
        <ul className="sidebar-nav" id="category-nav">
          <li className={currentCategory === 'all' ? 'active-marker' : ''}>
            <a
              href="#"
              className={currentCategory === 'all' ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); onCategoryChange('all'); }}
            >
              All Products
            </a>
          </li>

          {CATEGORY_GROUPS.map((group) => (
            <li key={group.id} className={`cat-group${openGroups[group.id] ? ' open' : ''}`}>
              <a
                href="#"
                className="cat-group-toggle"
                onClick={(e) => { e.preventDefault(); onToggleGroup(group.id); }}
              >
                {group.label}
              </a>
              <ul className="cat-sub">
                {group.items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className={currentCategory === item ? 'active' : ''}
                      onClick={(e) => { e.preventDefault(); onCategoryChange(item); }}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}

          {[
            { id: 'new', label: 'New Collection' },
            { id: 'best-sellers', label: 'Best Sellers' },
            { id: 'discounted', label: 'Discounted Products' },
          ].map((item) => (
            <li key={item.id} className={currentCategory === item.id ? 'active-marker' : ''}>
              <a
                href="#"
                className={currentCategory === item.id ? 'active' : ''}
                onClick={(e) => { e.preventDefault(); onCategoryChange(item.id); }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-section">
        <p className="sidebar-label">Filter by</p>
        <label className="filter-check">
          <input
            type="checkbox"
            checked={filterAvailable}
            onChange={(e) => onFilterAvailableChange(e.target.checked)}
          />
          Availability
        </label>
        <label className="filter-check" style={{ marginTop: 6 }}>
          <input
            type="checkbox"
            checked={filterDiscount}
            onChange={(e) => onFilterDiscountChange(e.target.checked)}
          />
          Discount
        </label>
      </div>
    </aside>
  );
}
