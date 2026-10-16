import Link from 'next/link';
import { SUBSCRIPTION_PLANS } from '@/constants/payments';

export default function PolicyPlanSummary() {
  return <section aria-labelledby="standard-plans">
    <h2 id="standard-plans" className="text-lg font-semibold mb-3">Standard membership plans</h2>
    <p className="text-sm leading-7 mb-3">These are the standard plans listed on our pricing page. Prices are in Indian rupees. Confirm availability, price, discounts and duration at checkout before paying; keep your receipt.</p>
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Standard prices, validity and contact allowance</caption>
        <thead className="bg-surface"><tr>{['Plan', 'Price', 'Validity', 'Contact allowance'].map(label => <th className="p-3 font-semibold" scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => <tr className="border-t border-border" key={plan.id}>
          <th className="p-3 font-medium" scope="row">{plan.name}</th>
          <td className="p-3 whitespace-nowrap">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(plan.price)}</td>
          <td className="p-3">{plan.durationLabel}</td>
          <td className="p-3">{plan.entitlements.contacts_limit} distinct contacts{key === 'FREE' ? '' : ' per term'}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <Link href="/pricing" className="inline-block underline mt-3 text-sm">Compare membership features and purchase</Link>
  </section>;
}
