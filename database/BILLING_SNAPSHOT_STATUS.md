# Purchase billing snapshots

New order creation validates buyer billing fields and stores a versioned buyer/seller snapshot on the payment. Seller contact fields come from server configuration; buyer email comes from authenticated identity. Transaction INSERT copies the payment snapshot, including the atomic subscription fulfillment path. Database triggers prevent later changes to payment and transaction snapshots.

The receipt reads saved snapshot fields, never the current editable billing draft. Legacy receipts with no snapshot display missing details rather than inventing history. Local billing drafts are keyed by authenticated account ID; unscoped legacy drafts are not automatically reused.

Rollback database tests passed snapshot copying and edit denial on both payment and transaction. All test rows rolled back. Browser checkout and receipt printing remain unverified, and official legal business/tax details remain pending owner input. No real payment or production deployment occurred.
