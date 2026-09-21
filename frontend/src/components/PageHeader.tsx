import type { ReactNode } from "react";

export function PageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <header className="feature-header"><div><h1>{title}</h1><p>{description}</p></div>{action}</header>;
}
