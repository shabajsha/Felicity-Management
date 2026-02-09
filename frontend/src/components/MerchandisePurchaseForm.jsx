import { useMemo, useState } from 'react';
import { useToast } from './Toast.jsx';
import './MerchandisePurchaseForm.css';

const MerchandisePurchaseForm = ({ event, onSubmit, onCancel }) => {
  const { showError } = useToast();
  const merchandise = event?.merchandise || {};

  const [selection, setSelection] = useState({
    variantSku: '',
    size: '',
    color: '',
    quantity: 1
  });

  const variants = useMemo(() => merchandise.variants || [], [merchandise]);
  const purchaseLimit = merchandise.purchaseLimit || 1;

  const stockLeft = useMemo(() => {
    if (selection.variantSku && variants.length > 0) {
      const variant = variants.find(v => v.sku === selection.variantSku);
      return variant ? variant.stock : 0;
    }
    return merchandise.stock || 0;
  }, [selection.variantSku, variants, merchandise.stock]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const quantity = Number(selection.quantity) || 1;

    if (quantity < 1) {
      showError('Quantity must be at least 1');
      return;
    }
    if (quantity > purchaseLimit) {
      showError(`Purchase limit is ${purchaseLimit} items`);
      return;
    }
    if (quantity > stockLeft) {
      showError('Not enough stock available');
      return;
    }

    if (variants.length > 0 && !selection.variantSku) {
      showError('Please select a variant');
      return;
    }

    onSubmit({
      merchandise: {
        variantSku: selection.variantSku || null,
        size: selection.size || null,
        color: selection.color || null,
        quantity
      }
    });
  };

  return (
    <div className="merch-form">
      <div className="form-header">
        <h2>Purchase Merchandise</h2>
        <p>{event?.title}</p>
      </div>

      <form onSubmit={handleSubmit}>
        {variants.length > 0 ? (
          <div className="form-group">
            <label>Variant *</label>
            <select
              value={selection.variantSku}
              onChange={(e) => setSelection(prev => ({ ...prev, variantSku: e.target.value }))}
            >
              <option value="">Select variant</option>
              {variants.map((variant) => (
                <option key={variant.sku || `${variant.size}-${variant.color}`} value={variant.sku}>
                  {variant.size || '-'} / {variant.color || '-'} • ₹{variant.price || 0} • {variant.stock || 0} left
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>Size</label>
                <input
                  type="text"
                  value={selection.size}
                  onChange={(e) => setSelection(prev => ({ ...prev, size: e.target.value }))}
                  placeholder="e.g., M"
                />
              </div>
              <div className="form-group">
                <label>Color</label>
                <input
                  type="text"
                  value={selection.color}
                  onChange={(e) => setSelection(prev => ({ ...prev, color: e.target.value }))}
                  placeholder="e.g., Black"
                />
              </div>
            </div>
          </>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>Quantity</label>
            <input
              type="number"
              min="1"
              max={purchaseLimit}
              value={selection.quantity}
              onChange={(e) => setSelection(prev => ({ ...prev, quantity: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Stock Remaining</label>
            <input type="text" value={stockLeft} readOnly />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary">Confirm Purchase</button>
        </div>
      </form>
    </div>
  );
};

export default MerchandisePurchaseForm;
