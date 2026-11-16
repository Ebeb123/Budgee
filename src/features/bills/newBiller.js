// ---------------------------------------------------------------------------
// Hand-off for "New biller" opened from the bill form: the biller screen
// stores the id it just created, and the bill form picks it up (once) when it
// comes back into focus, so the new biller is already selected.
// ---------------------------------------------------------------------------

let pending = null;

export function setNewBillerId(id) {
  pending = id;
}

export function consumeNewBillerId() {
  const id = pending;
  pending = null;
  return id;
}
