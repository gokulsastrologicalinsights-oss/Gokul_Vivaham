# Coupon checkout limits

Applied coupon-reservations.sql. Pending payments reserve a coupon use. A trigger locks the coupon row and checks completed uses plus pending reservations before admitting another payment. This serializes competing checkouts. An index supports pending reservation lookup.

Bad checkout signatures cannot mark an order failed or release its reservation. A payment.failed webhook represents an attempt failure and now preserves the pending order, allowing safe retries and avoiding late-capture overbooking. Completed payments remain completed when delayed failure notifications arrive.

Rollback-only database tests passed final-use reservation, second-order denial, updating the same payment, and releasing a reservation by an explicit terminal failed status. TypeScript passed. Actual concurrent connections and provider retries were not exercised. No charges made.

Abandoned orders conservatively retain reservations. Provider-confirmed order closure and reservation cleanup still need implementation; do not clear reservations merely because a browser closes or a timer expires. Other payment products still need atomic fulfillment review.
