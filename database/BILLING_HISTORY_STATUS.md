# Billing history and receipts

Removed sample seller company, GSTIN, address and billing email from the printable receipt. It uses the existing site contact configuration and brand. Official legal seller details and tax invoice configuration are pending owner information. Status badges use the transaction status rather than always showing PAID. The existing recorded amounts are displayed without asserting an unverified tax rate.

Billing history now distinguishes failed loading from an empty history and offers retry. The transaction service selects explicit receipt fields and the gateway payment reference, excluding unnecessary payment signature data.

Authenticated-role rollback tests verified own receipt visibility and another member's receipt denial. All fixtures rolled back. Browser receipt rendering/printing remains unverified. Buyer information still comes from the current billing profile rather than a purchase-time snapshot; immutable invoice snapshots remain future work. No production deployment change.
