import { Card, CardBody, CardHeader } from "~/components/ui/Card";

const SECTIONS = [
  {
    title: "Billing",
    description: "Reserved for subscriptions, invoices, and plan controls in a later phase."
  },
  {
    title: "AI usage",
    description: "Reserved for future usage limits, provider settings, and audit controls."
  },
  {
    title: "Custom domains",
    description: "Reserved for domain verification, certificates, and routing controls."
  },
  {
    title: "Abuse review",
    description: "Reserved for reports, takedowns, and safety review workflows."
  },
  {
    title: "Feature flags",
    description: "Reserved for gradual rollout controls and tenant-level experiments."
  }
];

export default function AdminSettings() {
  return (
    <Card>
      <CardHeader
        title="Platform settings"
        description="Read-only placeholders for future platform controls. Nothing here activates Phase 2 features yet."
      />
      <CardBody>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {SECTIONS.map((section) => (
            <div key={section.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="font-medium text-slate-900">{section.title}</div>
              <div className="mt-1 text-sm text-slate-600">{section.description}</div>
              <div className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                Not enabled in Phase 1
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
