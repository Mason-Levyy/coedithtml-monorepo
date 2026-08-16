export const LINK_PERMISSIONS = ["view", "suggest", "edit"] as const;

export type LinkPermission = (typeof LINK_PERMISSIONS)[number];

export const LINK_TOKEN_FIELD = {
  view: "viewToken",
  suggest: "suggestToken",
  edit: "editToken",
} as const satisfies Record<LinkPermission, string>;

export const LINK_URL_FIELD = {
  view: "viewUrl",
  suggest: "suggestUrl",
  edit: "editUrl",
} as const satisfies Record<LinkPermission, string>;
