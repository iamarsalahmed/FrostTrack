export const ORDER_STATUS = Object.freeze({
  PLACED: 'placed',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
});

export function canCancelOrder(status) {
  return status === ORDER_STATUS.PLACED;
}

export function normalizeCancellationReason(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw Object.assign(new Error('Reason must be text.'), { status: 400 });
  const reason = value.trim();
  if (reason.length > 240) {
    throw Object.assign(new Error('Cancellation reason must be 240 characters or fewer.'), { status: 400 });
  }
  return reason || null;
}
