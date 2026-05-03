export type Role = "owner" | "super_admin";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  workspaceId: string;
};

export type Workspace = {
  id: string;
  slug: string;
  name: string;
};

